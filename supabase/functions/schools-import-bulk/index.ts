import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchoolImportData {
  name: string;
  city: string;
  state: string;
  zip: string;
  address_line1?: string;
  district?: string;
  county?: string;
  school_level?: string;
}

function generateSlug(name: string, city: string, state: string): string {
  const baseSlug = `${name}-${city}-${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return baseSlug;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const schools: SchoolImportData[] = body.schools;
    const adminPasscode = body.adminPasscode;
    const adminPasscodeEnv = Deno.env.get('ADMIN_PASSCODE');

    // Check admin passcode first (for admin panel authentication)
    if (adminPasscode && adminPasscodeEnv && adminPasscode === adminPasscodeEnv) {
      console.log('[schools-import-bulk] Admin authenticated via passcode');
      // Passcode is valid, proceed with import
    } else {
      // Fall back to Supabase auth + user_roles check
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization. Please log in to the admin panel.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error('[schools-import-bulk] Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized. Please log in to the admin panel.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[schools-import-bulk] User authenticated:', user.id);

      // Check if user has admin role
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        console.error('[schools-import-bulk] Role check error:', roleError);
      }

      console.log('[schools-import-bulk] Roles found:', roles);

      if (!roles) {
        console.error('[schools-import-bulk] User does not have admin role:', user.id);
        return new Response(
          JSON.stringify({ error: 'Admin access required. Please log in to the admin panel with the admin passcode.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!Array.isArray(schools) || schools.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid schools data. Expected array of schools.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[schools-import-bulk] Importing ${schools.length} schools`);

    // Process schools in batches of 100
    const batchSize = 100;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < schools.length; i += batchSize) {
      const batch = schools.slice(i, i + batchSize);
      
      const schoolsToInsert = batch.map(school => ({
        name: school.name,
        city: school.city,
        state: school.state,
        zip: school.zip,
        address_line1: school.address_line1 || `${school.city}, ${school.state}`,
        slug: generateSlug(school.name, school.city, school.state),
        district: school.district || null,
        county: school.county || null,
        school_level: school.school_level || null,
        is_verified: true, // Mark bulk imported schools as verified
        country: 'USA',
      }));

      const { data, error } = await supabase
        .from('schools_user_added')
        .upsert(schoolsToInsert, { 
          onConflict: 'slug',
          ignoreDuplicates: false 
        })
        .select('id');

      if (error) {
        console.error(`[schools-import-bulk] Error in batch ${i / batchSize + 1}:`, error);
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        skipped += batch.length;
      } else {
        imported += data?.length || 0;
        console.log(`[schools-import-bulk] Imported batch ${i / batchSize + 1}: ${data?.length} schools`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        total: schools.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[schools-import-bulk] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
