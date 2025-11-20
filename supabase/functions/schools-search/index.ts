import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let query = '';
    let limit = 20;

    // Handle both GET and POST requests
    if (req.method === 'GET') {
      const url = new URL(req.url);
      query = url.searchParams.get('q') || '';
      limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    } else if (req.method === 'POST') {
      const body = await req.json();
      query = body.q || '';
      limit = Math.min(parseInt(body.limit || '20'), 100);
    }

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ schools: [], count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[schools-search] Searching for: "${query}"`);

    // Try full-text search first
    const searchQuery = query.trim().split(/\s+/).join(' & ');
    
    const { data, error, count } = await supabase
      .from('schools_user_added')
      .select('id, name, city, state, zip, district, school_level', { count: 'exact' })
      .textSearch('search_vector', searchQuery, {
        type: 'websearch',
        config: 'english'
      })
      .limit(limit);

    if (error) {
      console.error('[schools-search] Full-text search error:', error);
      
      // Fallback to ILIKE search if full-text fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('schools_user_added')
        .select('id, name, city, state, zip, district, school_level')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%,zip.ilike.%${query}%`)
        .limit(limit);

      if (fallbackError) {
        throw fallbackError;
      }

      return new Response(
        JSON.stringify({ 
          schools: fallbackData || [], 
          count: fallbackData?.length || 0,
          searchType: 'fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[schools-search] Found ${data?.length || 0} schools`);

    return new Response(
      JSON.stringify({ 
        schools: data || [], 
        count: count || 0,
        searchType: 'fulltext'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[schools-search] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
