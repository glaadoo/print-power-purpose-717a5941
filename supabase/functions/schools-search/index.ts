import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple fuzzy matching using character-based similarity
function calculateSimilarity(query: string, target: string): number {
  if (!target) return 0;
  
  // Exact match
  if (target === query) return 2.0;
  
  // Starts with query (prefix match)
  if (target.startsWith(query)) return 1.5;
  
  // Contains query (substring match)
  if (target.includes(query)) return 1.0;
  
  // Calculate character-based similarity for typos
  const queryChars = query.split('');
  
  // Count matching characters in order
  let matches = 0;
  let targetIndex = 0;
  
  for (const char of queryChars) {
    const foundIndex = target.indexOf(char, targetIndex);
    if (foundIndex >= 0) {
      matches++;
      targetIndex = foundIndex + 1;
    }
  }
  
  // Calculate similarity ratio
  const ratio = matches / query.length;
  
  // Bonus for similar length (catches typos better)
  const lengthDiff = Math.abs(target.length - query.length);
  const lengthPenalty = Math.max(0, 1 - (lengthDiff / query.length));
  
  return ratio * 0.8 * lengthPenalty;
}

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

    // Clean and prepare query
    const cleanQuery = query.trim().toLowerCase();
    
    // Use fuzzy matching with trigram similarity (handles typos and variations)
    // Combined with ILIKE for exact/prefix matches
    const { data, error } = await supabase
      .from('schools_user_added')
      .select('id, name, city, state, zip, district, school_level')
      .or(`name.ilike.%${cleanQuery}%,city.ilike.%${cleanQuery}%,state.ilike.%${cleanQuery}%,zip.ilike.%${cleanQuery}%,district.ilike.%${cleanQuery}%`)
      .limit(limit * 2); // Get more results for similarity filtering

    if (error) {
      console.error('[schools-search] Search error:', error);
      throw error;
    }

    // Apply fuzzy matching and scoring on the results
    const scoredResults = (data || []).map(school => {
      // Calculate similarity scores for each field
      const nameScore = calculateSimilarity(cleanQuery, school.name.toLowerCase());
      const cityScore = calculateSimilarity(cleanQuery, school.city.toLowerCase());
      const stateScore = calculateSimilarity(cleanQuery, school.state.toLowerCase());
      const zipScore = school.zip.toLowerCase().includes(cleanQuery) ? 1 : 0;
      const districtScore = school.district ? calculateSimilarity(cleanQuery, school.district.toLowerCase()) : 0;
      
      // Weight the scores (name and city are most important)
      const totalScore = (nameScore * 3) + (cityScore * 2) + (stateScore * 1.5) + (zipScore * 1) + (districtScore * 0.5);
      
      return {
        ...school,
        score: totalScore
      };
    })
    .filter(school => school.score > 0.3) // Filter out low-relevance results
    .sort((a, b) => b.score - a.score) // Sort by relevance
    .slice(0, limit) // Limit to requested count
    .map(({ score, ...school }) => school); // Remove score from final results

    console.log(`[schools-search] Found ${scoredResults.length} relevant schools`);

    return new Response(
      JSON.stringify({ 
        schools: scoredResults, 
        count: scoredResults.length
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
