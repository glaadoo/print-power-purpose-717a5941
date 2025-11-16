import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddSchoolRequest {
  name: string;
  district?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  county?: string | null;
  zip: string;
  country?: string | null;
  school_level?: string | null;
}

// Sanitize and normalize text
function sanitize(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>]/g, ''); // Strip remaining angle brackets
}

// Generate slug from name, city, state
function generateSlug(name: string, city: string, state: string): string {
  const cleanName = sanitize(name).toLowerCase();
  const cleanCity = sanitize(city).toLowerCase();
  const cleanState = sanitize(state).toUpperCase();
  return `${cleanName}|${cleanCity}|${cleanState}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: AddSchoolRequest = await req.json();

    // Validate required fields
    if (!body.name || !body.address_line1 || !body.city || !body.state || !body.zip) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, address_line1, city, state, zip' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate state (2 letters)
    if (!/^[A-Z]{2}$/i.test(body.state)) {
      return new Response(
        JSON.stringify({ error: 'State must be 2 letters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate ZIP (3-10 chars, digits and dash)
    if (!/^[\d-]{3,10}$/.test(body.zip)) {
      return new Response(
        JSON.stringify({ error: 'ZIP must be 3-10 characters, digits and dash only' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize all inputs
    const sanitizedData = {
      name: sanitize(body.name),
      district: body.district ? sanitize(body.district) : null,
      address_line1: sanitize(body.address_line1),
      address_line2: body.address_line2 ? sanitize(body.address_line2) : null,
      city: sanitize(body.city),
      state: sanitize(body.state).toUpperCase(),
      county: body.county ? sanitize(body.county) : null,
      zip: sanitize(body.zip),
      country: body.country ? sanitize(body.country) : 'USA',
      school_level: body.school_level ? sanitize(body.school_level) : null,
    };

    // Generate slug
    const slug = generateSlug(sanitizedData.name, sanitizedData.city, sanitizedData.state);

    console.log('[schools-add] Generated slug:', slug);

    // Check if school already exists
    const { data: existing, error: checkError } = await supabase
      .from('schools_user_added')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (checkError) {
      console.error('[schools-add] Error checking for existing school:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log('[schools-add] School already exists, returning existing school');
      return new Response(
        JSON.stringify({
          reused: true,
          school: existing,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new school
    const { data: newSchool, error: insertError } = await supabase
      .from('schools_user_added')
      .insert([{
        ...sanitizedData,
        slug,
        is_verified: false,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (insertError) {
      // Handle UNIQUE constraint violation (race condition)
      if (insertError.code === '23505') {
        console.log('[schools-add] UNIQUE constraint violation, fetching existing school');
        const { data: existingSchool } = await supabase
          .from('schools_user_added')
          .select('*')
          .eq('slug', slug)
          .single();

        return new Response(
          JSON.stringify({
            reused: true,
            school: existingSchool,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('[schools-add] Error inserting school:', insertError);
      throw insertError;
    }

    console.log('[schools-add] Successfully added new school:', newSchool.id);

    return new Response(
      JSON.stringify({
        reused: false,
        school: newSchool,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[schools-add] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});