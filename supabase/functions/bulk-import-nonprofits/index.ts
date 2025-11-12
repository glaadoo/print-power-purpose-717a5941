import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
      },
    });

    // Parse payload early to support either Supabase JWT or admin session token
    const payload = await req.json().catch(() => ({}));
    const nonprofits = payload?.nonprofits;
    const sessionToken = payload?.sessionToken;

    // Verify admin via either user JWT (roles) or admin session token
    let isAdmin = false;

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        // Check if user has admin role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        if (roles) isAdmin = true;
      }
    }

    // Fallback to custom admin session token
    if (!isAdmin && sessionToken) {
      const { data: sessionRow } = await supabase
        .from('admin_sessions')
        .select('id')
        .eq('token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (sessionRow) isAdmin = true;
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!nonprofits || !Array.isArray(nonprofits)) {
      return new Response(JSON.stringify({ error: 'Invalid request: nonprofits array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
      return new Response(JSON.stringify({ error: 'Invalid request: nonprofits array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Normalize input and split EINs for duplicate check
    const inputNonprofits = (nonprofits as any[]).map((n) => ({
      name: String(n.name).trim(),
      ein: n.ein ? String(n.ein).trim() : null,
      city: n.city ?? null,
      state: n.state ?? null,
      country: n.country ?? 'US',
      description: n.description ?? null,
      source: n.source ?? 'irs',
      approved: n.approved ?? true,
    }));

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
