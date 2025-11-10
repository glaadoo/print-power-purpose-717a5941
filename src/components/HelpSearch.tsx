import { useState, useRef, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SearchResult {
  id: string;
  type: 'faq' | 'topic' | 'action';
  title: string;
  excerpt: string;
  href: string;
  requires_auth: boolean;
}

interface HelpSearchProps {
  onOpenChat?: () => void;
}

export default function HelpSearch({ onOpenChat }: HelpSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ faqs: SearchResult[]; topics: SearchResult[]; actions: SearchResult[] }>({
    faqs: [],
    topics: [],
    actions: []
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [user, setUser] = useState<any>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const allResults = [...results.faqs, ...results.topics, ...results.actions];

  const searchHelp = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults({ faqs: [], topics: [], actions: [] });
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('help-search', {
        body: { q: q.trim() }
      });

      if (error) throw error;

      // Filter auth-required actions based on login status
      const filteredActions = (data.actions || []).map((action: SearchResult) => {
        if (action.requires_auth && !user) {
          return {
            ...action,
            title: `Sign in to ${action.title.toLowerCase()}`,
            href: `/auth?next=${encodeURIComponent(action.href)}`
          };
        }
        return action;
      });

      setResults({
        faqs: data.faqs || [],
        topics: data.topics || [],
        actions: filteredActions
      });
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults({ faqs: [], topics: [], actions: [] });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchHelp(value);
    }, 180);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < allResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleResultClick(allResults[highlightedIndex]);
        } else {
          handleFullSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    logSearch(allResults.length);
    setIsOpen(false);
    setQuery("");
    navigate(result.href);
  };

  const handleFullSearch = () => {
    if (!query.trim()) return;
    logSearch(allResults.length);
    setIsOpen(false);
    navigate(`/help/search?q=${encodeURIComponent(query)}`);
    setQuery("");
  };

  const logSearch = async (count: number) => {
    try {
      await supabase.functions.invoke('help-log', {
        body: {
          q: query,
          resultsCount: count,
          clientTs: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log search:', error);
    }
  };

  const EmptyState = () => (
    <div className="p-6 text-center">
      <p className="text-sm text-muted-foreground mb-4">
        No results for '{query}'.
      </p>
      {onOpenChat && (
        <button
          onClick={() => {
            setIsOpen(false);
            onOpenChat();
          }}
          className="text-sm text-primary hover:underline mb-2"
        >
          Chat with Kenzie 🐾
        </button>
      )}
      <p className="text-xs text-muted-foreground">
        or email{" "}
        <a href="mailto:support@printpowerpurpose.com" className="text-primary hover:underline">
          support@printpowerpurpose.com
        </a>
      </p>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search common questions... try 'orders'"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="pl-12 pr-4 h-14 text-base bg-background/10 backdrop-blur-md border-border/20 ring-border/20 focus-visible:ring-border/40 rounded-2xl"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="search-results"
            aria-activedescendant={highlightedIndex >= 0 ? `result-${highlightedIndex}` : undefined}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-black/80 backdrop-blur-xl border-border/20 rounded-2xl"
        align="start"
        sideOffset={8}
      >
        <div 
          id="search-results" 
          role="listbox"
          className="max-h-[60vh] overflow-y-auto"
          aria-label="Search results"
        >
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : allResults.length === 0 && query.trim() ? (
            <EmptyState />
          ) : (
            <div className="py-2">
              {results.faqs.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    FAQs
                  </div>
                  {results.faqs.map((result, idx) => (
                    <button
                      key={result.id}
                      id={`result-${idx}`}
                      role="option"
                      aria-selected={highlightedIndex === idx}
                      onClick={() => handleResultClick(result)}
                      className={`w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors ${
                        highlightedIndex === idx ? 'bg-primary/20' : ''
                      }`}
                    >
                      <div className="font-medium text-sm text-foreground">{result.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{result.excerpt}</div>
                    </button>
                  ))}
                </div>
              )}
              {results.topics.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Topics
                  </div>
                  {results.topics.map((result, idx) => {
                    const globalIdx = results.faqs.length + idx;
                    return (
                      <button
                        key={result.id}
                        id={`result-${globalIdx}`}
                        role="option"
                        aria-selected={highlightedIndex === globalIdx}
                        onClick={() => handleResultClick(result)}
                        className={`w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors ${
                          highlightedIndex === globalIdx ? 'bg-primary/20' : ''
                        }`}
                      >
                        <div className="font-medium text-sm text-foreground">{result.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{result.excerpt}</div>
                      </button>
                    );
                  })}
                </div>
              )}
              {results.actions.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Quick Actions
                  </div>
                  {results.actions.map((result, idx) => {
                    const globalIdx = results.faqs.length + results.topics.length + idx;
                    return (
                      <button
                        key={result.id}
                        id={`result-${globalIdx}`}
                        role="option"
                        aria-selected={highlightedIndex === globalIdx}
                        onClick={() => handleResultClick(result)}
                        className={`w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors ${
                          highlightedIndex === globalIdx ? 'bg-primary/20' : ''
                        }`}
                      >
                        <div className="font-medium text-sm text-foreground">{result.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{result.excerpt}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
