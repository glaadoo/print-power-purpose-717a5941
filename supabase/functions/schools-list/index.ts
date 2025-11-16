import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const state = url.searchParams.get('state');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 50);

    console.log('[schools-list] Query params:', { state, page, pageSize });

    // Build query
    let query = supabase
      .from('schools_user_added')
      .select('id, name, city, state, county, zip, school_level, created_at', { count: 'exact' });

    // Filter by state if provided
    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    // Order and paginate
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[schools-list] Error fetching schools:', error);
      throw error;
    }

    console.log('[schools-list] Fetched', data?.length || 0, 'schools (total:', count, ')');

    return new Response(
      JSON.stringify({
        items: data || [],
        page,
        pageSize,
        total: count || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[schools-list] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});