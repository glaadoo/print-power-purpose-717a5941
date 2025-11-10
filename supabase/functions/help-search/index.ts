import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  id: string;
  type: 'faq' | 'topic' | 'action';
  title: string;
  slug: string;
  excerpt: string;
  href: string;
  requires_auth: boolean;
  relevance: number;
}

// In-memory LRU cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds
const MAX_CACHE_SIZE = 500;

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
  cache.set(key, { data, timestamp: Date.now() });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim().toLowerCase() || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '6'), 50);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const section = url.searchParams.get('section') || 'all';

    // Validation
    if (!q || q.length < 1 || q.length > 64) {
      return new Response(
        JSON.stringify({ error: 'Query must be between 1 and 64 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = `${q}-${limit}-${offset}-${section}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get synonyms for query expansion
    const { data: synonymsData } = await supabase
      .from('help_synonyms')
      .select('synonyms')
      .ilike('term', q)
      .single();

    const expandedTerms = [q];
    if (synonymsData?.synonyms) {
      expandedTerms.push(...synonymsData.synonyms.map((s: string) => s.toLowerCase()));
    }

    // Build search query with ranking
    let query = supabase
      .from('help_articles')
      .select('*')
      .eq('active', true);

    // Filter by section if specified
    if (section !== 'all') {
      query = query.eq('type', section === 'faqs' ? 'faq' : section === 'topics' ? 'topic' : 'action');
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error('Search error:', error);
      return new Response(
        JSON.stringify({ error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rank results
    const rankedResults: SearchResult[] = (articles || []).map((article: any) => {
      let relevance = 0;

      // Title match (highest priority)
      const titleLower = article.title.toLowerCase();
      for (const term of expandedTerms) {
        if (titleLower.includes(term)) {
          relevance += 10;
        }
      }

      // Keywords match
      const keywords = article.keywords || [];
      for (const keyword of keywords) {
        for (const term of expandedTerms) {
          if (keyword.toLowerCase().includes(term) || term.includes(keyword.toLowerCase())) {
            relevance += 5;
          }
        }
      }

      // Body match (lowest priority)
      const bodyLower = article.body.toLowerCase();
      for (const term of expandedTerms) {
        if (bodyLower.includes(term)) {
          relevance += 2;
        }
      }

      // Excerpt match
      const excerptLower = article.excerpt.toLowerCase();
      for (const term of expandedTerms) {
        if (excerptLower.includes(term)) {
          relevance += 3;
        }
      }

      return {
        id: article.id,
        type: article.type,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        href: article.href,
        requires_auth: article.requires_auth,
        relevance,
      };
    }).filter(r => r.relevance > 0);

    // Sort by relevance, then by title
    rankedResults.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return a.title.localeCompare(b.title);
    });

    // Apply pagination
    const paginatedResults = rankedResults.slice(offset, offset + limit);

    // Group by type for "all" section
    let response;
    if (section === 'all') {
      response = {
        query: q,
        total: rankedResults.length,
        faqs: rankedResults.filter(r => r.type === 'faq').slice(0, 6),
        topics: rankedResults.filter(r => r.type === 'topic').slice(0, 6),
        actions: rankedResults.filter(r => r.type === 'action').slice(0, 6),
      };
    } else {
      response = {
        query: q,
        total: rankedResults.length,
        results: paginatedResults,
      };
    }

    // Cache the response
    setCache(cacheKey, response);

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'ETag': `"${cacheKey}"`,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
