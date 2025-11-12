import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const NonprofitSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be less than 200 characters").trim(),
  ein: z.string().regex(/^\d{2}-?\d{7}$/, "EIN must be in format XX-XXXXXXX or XXXXXXXXX").transform(val => {
    // Normalize EIN format to XX-XXXXXXX
    const digits = val.replace(/\D/g, '');
    return digits.length === 9 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : val;
  }).optional().nullable(),
  city: z.string().max(100, "City must be less than 100 characters").optional().nullable(),
  state: z.string().length(2, "State must be 2-letter code").regex(/^[A-Z]{2}$/, "State must be uppercase").optional().nullable(),
  country: z.preprocess((val) => {
    if (val === null || val === undefined) return "US";
    const raw = String(val).trim();
    if (!raw) return "US";
    const up = raw.toUpperCase();
    const map: Record<string, string> = {
      'US': 'US',
      'USA': 'US',
      'U.S.': 'US',
      'U.S.A.': 'US',
      'UNITED STATES': 'US',
      'UNITED STATES OF AMERICA': 'US',
      'UNITED STATES, USA': 'US',
      'CA': 'CA',
      'CAN': 'CA',
      'CANADA': 'CA',
    };
    if (map[up]) return map[up];
    if (up.length === 2) return up;
    return 'US';
  }, z.string().length(2, "Country must be 2-letter ISO code").regex(/^[A-Z]{2}$/, "Country must be 2-letter ISO code")),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional().nullable(),
  source: z.enum(["curated", "irs"]).default("irs"),
  approved: z.boolean().default(true),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`
        }
      }
    });

    // Parse payload early to support admin session token validation
    const payload = await req.json().catch(() => ({}));
    const nonprofits = payload?.nonprofits;
    const sessionToken = payload?.sessionToken;

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Session token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the admin session token
    const { data: sessionRow, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('id')
      .eq('token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (sessionError || !sessionRow) {
      return new Response(JSON.stringify({ error: 'Forbidden: Invalid or expired session' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('bulk-import-nonprofits invoked', {
      count: Array.isArray(nonprofits) ? nonprofits.length : null,
      hasValidSession: !!sessionRow
    });

    if (!nonprofits || !Array.isArray(nonprofits)) {
      return new Response(JSON.stringify({ error: 'Invalid request: nonprofits array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and normalize input
    const validationErrors: Array<{ index: number; errors: string[] }> = [];
    const inputNonprofits: any[] = [];

    for (let i = 0; i < nonprofits.length; i++) {
      const result = NonprofitSchema.safeParse(nonprofits[i]);
      if (!result.success) {
        validationErrors.push({
          index: i,
          errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        });
      } else {
        inputNonprofits.push(result.data);
      }
    }

    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          validationErrors,
          message: `${validationErrors.length} record(s) failed validation`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build set of EINs we are about to insert (only non-null values)
    const eins = inputNonprofits
      .map((n) => n.ein)
      .filter((e: string | null): e is string => !!e);

    let existingEins = new Set<string>();
    if (eins.length > 0) {
      const { data: existing, error: dupErr } = await supabase
        .from('nonprofits')
        .select('ein')
        .in('ein', eins);
      if (dupErr) {
        console.error('Duplicate check error:', dupErr);
        throw dupErr;
      }
      existingEins = new Set((existing || []).map((r: any) => r.ein).filter(Boolean));
    }

    // Filter out duplicates by EIN (keep rows with null EINs)
    const toInsert = inputNonprofits.filter((n) => !n.ein || !existingEins.has(n.ein));

    if (toInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: true, imported: 0, skipped: inputNonprofits.length, message: 'All records were duplicates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert nonprofits using service role (bypasses RLS)
    const { error: insertError } = await supabase
      .from('nonprofits')
      .insert(toInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: toInsert.length,
        skipped: inputNonprofits.length - toInsert.length,
        message: 'Nonprofits imported successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
