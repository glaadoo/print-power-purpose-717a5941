import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelectSchoolRequest {
  sessionId: string;
  schoolId: string;
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

    const body: SelectSchoolRequest = await req.json();

    if (!body.sessionId || !body.schoolId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId, schoolId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[schools-select] Selecting school:', body.schoolId, 'for session:', body.sessionId);

    // Verify school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools_user_added')
      .select('id, name, city, state')
      .eq('id', body.schoolId)
      .maybeSingle();

    if (schoolError) {
      console.error('[schools-select] Error fetching school:', schoolError);
      throw schoolError;
    }

    if (!school) {
      return new Response(
        JSON.stringify({ error: 'School not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert cart session
    const { error: upsertError } = await supabase
      .from('cart_sessions')
      .upsert({
        session_id: body.sessionId,
        selected_school_id: school.id,
        selected_school_name: school.name,
        selected_school_city: school.city,
        selected_school_state: school.state,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('[schools-select] Error upserting cart session:', upsertError);
      throw upsertError;
    }

    console.log('[schools-select] Successfully selected school');

    return new Response(
      JSON.stringify({
        ok: true,
        school: {
          id: school.id,
          name: school.name,
          city: school.city,
          state: school.state,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[schools-select] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});