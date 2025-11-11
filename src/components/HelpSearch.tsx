import { useState, useRef, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const lastQueryRef = useRef("");
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
      lastQueryRef.current = q.trim();
      const current = lastQueryRef.current;
      const { data, error } = await supabase.functions.invoke('help-search', {
        body: { q: current }
      });

      // Ignore stale responses
      if (current !== lastQueryRef.current) return;

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
    }, 280);
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
    if (!query.trim()) return; // Don't log empty queries
    try {
      await supabase.functions.invoke('help-log', {
        body: {
          q: query.trim(),
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
          <Input
            type="search"
            placeholder="Search common questions... try 'orders'"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            autoFocus
            className="pl-12 pr-4 h-14 text-base bg-background/10 backdrop-blur-md border-border/20 ring-border/20 focus-visible:ring-border/40 rounded-2xl"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="search-results"
            aria-activedescendant={highlightedIndex >= 0 ? `result-${highlightedIndex}` : undefined}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border border-gray-200 rounded-2xl shadow-xl z-[80] overscroll-contain max-h-[70vh] md:max-h-[32rem] overflow-hidden"
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={8}
      >
        <ScrollArea className="max-h-[70vh] md:max-h-[32rem] overflow-y-auto overscroll-contain">
          <div 
            id="search-results" 
            role="listbox"
            aria-label="Search results"
          >
          {isLoading ? (
            <div className="p-6 text-center bg-white">
              <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : allResults.length === 0 && query.trim() ? (
            <EmptyState />
          ) : (
            <div className="py-2 bg-white">
              {results.faqs.length > 0 && (
                <div className="mb-1">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                    FAQs
                  </div>
                  {results.faqs.map((result, idx) => (
                    <button
                      key={result.id}
                      id={`result-${idx}`}
                      role="option"
                      aria-selected={highlightedIndex === idx}
                      onClick={() => handleResultClick(result)}
                      className={`w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-b border-gray-100 ${
                        highlightedIndex === idx ? 'bg-amber-100' : ''
                      }`}
                    >
                      <div className="font-semibold text-sm text-gray-900">{result.title}</div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-1">{result.excerpt}</div>
                    </button>
                  ))}
                </div>
              )}
              {results.topics.length > 0 && (
                <div className="mb-1">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
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
                        className={`w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-b border-gray-100 ${
                          highlightedIndex === globalIdx ? 'bg-amber-100' : ''
                        }`}
                      >
                        <div className="font-semibold text-sm text-gray-900">{result.title}</div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-1">{result.excerpt}</div>
                      </button>
                    );
                  })}
                </div>
              )}
              {results.actions.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
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
                        className={`w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                          highlightedIndex === globalIdx ? 'bg-amber-100' : ''
                        }`}
                      >
                        <div className="font-semibold text-sm text-gray-900">{result.title}</div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-1">{result.excerpt}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>
          {/* Spacer to prevent last item from being hidden behind safe areas / keyboard */}
          <div aria-hidden className="h-4" style={{ height: 'max(env(safe-area-inset-bottom, 16px), 16px)' }} />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
