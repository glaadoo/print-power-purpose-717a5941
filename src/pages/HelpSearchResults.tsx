import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

interface SearchResult {
  id: string;
  type: 'faq' | 'topic' | 'action';
  title: string;
  excerpt: string;
  body: string;
  href: string;
  requires_auth: boolean;
}

export default function HelpSearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    document.title = `Search Results: ${query} | Print Power Purpose`;
  }, [query]);

  useEffect(() => {
    if (!query) return;
    searchAll();
  }, [query, page]);

  const searchAll = async () => {
    setIsLoading(true);
    try {
      const sections: ('faq' | 'topic' | 'action')[] = ['faq', 'topic', 'action'];
      const allResults: SearchResult[] = [];

      for (const section of sections) {
        const { data, error } = await supabase.functions.invoke('help-search', {
          body: { 
            q: query, 
            section: `${section}s`, 
            limit: 10, 
            offset: page * 10 
          }
        });

        if (!error && data?.results) {
          allResults.push(...data.results);
        }
      }

      if (page === 0) {
        setResults(allResults);
      } else {
        setResults(prev => [...prev, ...allResults]);
      }
      setHasMore(allResults.length === 30); // 10 per section
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const highlightMatch = (text: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-primary/30 text-foreground">$1</mark>');
  };

  const groupedResults = {
    faqs: results.filter(r => r.type === 'faq'),
    topics: results.filter(r => r.type === 'topic'),
    actions: results.filter(r => r.type === 'action'),
  };

  const ResultCard = ({ result }: { result: SearchResult }) => (
    <Link to={result.href} className="block group">
      <GlassCard className="hover:bg-primary/5 transition-all duration-300">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded">
                {result.type}
              </span>
            </div>
            <h3 
              className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors"
              dangerouslySetInnerHTML={{ __html: highlightMatch(result.title) }}
            />
            <p 
              className="text-sm text-muted-foreground line-clamp-2"
              dangerouslySetInnerHTML={{ __html: highlightMatch(result.excerpt) }}
            />
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </GlassCard>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background relative">
      <VideoBackground 
        srcMp4="https://wgohndthjgeqamfuldov.supabase.co/storage/v1/object/public/videos/pexels-pavel-danilyuk-8761527%20(2160p).mp4"
        parallaxVh={8}
        overlay={<div className="absolute inset-0 bg-black/60" />}
      />

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm">
          <ol className="flex items-center gap-2 text-muted-foreground">
            <li><Link to="/help" className="hover:text-foreground transition-colors">Help Center</Link></li>
            <li><ChevronRight className="w-4 h-4" /></li>
            <li className="text-foreground">Results for "{query}"</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Search Results
          </h1>
          <p className="text-xl text-muted-foreground">
            Found {results.length} results for "<span className="text-primary">{query}</span>"
          </p>
        </div>

        {isLoading && page === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              No results found
            </h2>
            <p className="text-muted-foreground mb-6">
              Try searching with different keywords or browse our help topics.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild>
                <Link to="/help">Back to Help Center</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="mailto:support@printpowerpurpose.com">Contact Support</a>
              </Button>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-12">
            {/* FAQs Section */}
            {groupedResults.faqs.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
                <div className="grid gap-4">
                  {groupedResults.faqs.map(result => (
                    <ResultCard key={result.id} result={result} />
                  ))}
                </div>
              </section>
            )}

            {/* Topics Section */}
            {groupedResults.topics.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6">Help Topics</h2>
                <div className="grid gap-4">
                  {groupedResults.topics.map(result => (
                    <ResultCard key={result.id} result={result} />
                  ))}
                </div>
              </section>
            )}

            {/* Actions Section */}
            {groupedResults.actions.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
                <div className="grid gap-4">
                  {groupedResults.actions.map(result => (
                    <ResultCard key={result.id} result={result} />
                  ))}
                </div>
              </section>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center">
                <Button
                  onClick={() => setPage(p => p + 1)}
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? 'Loading...' : 'Show More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
