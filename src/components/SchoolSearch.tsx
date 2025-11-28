import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface School {
  id: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  district?: string;
  school_level?: string;
}

interface Props {
  onSelect: (school: School) => void;
  selectedId?: string;
}

export default function SchoolSearch({ onSelect, selectedId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="font-bold underline decoration-2 underline-offset-2">{part}</span>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const formatSchoolLevel = (level: string) => {
    if (!level) return '';
    // If it already contains "School", return as is
    if (level.toLowerCase().includes('school')) return level;
    // Otherwise append "School"
    return `${level} School`;
  };

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const searchSchools = async () => {
      setLoading(true);
      try {
        console.log('[SchoolSearch] Searching for:', query);
        
        const { data, error } = await supabase.functions.invoke('schools-search', {
          body: { q: query, limit: 20 }
        });

        if (error) {
          console.error('[SchoolSearch] Error:', error);
          setResults([]);
          return;
        }
        
        console.log('[SchoolSearch] Search results:', data?.schools?.length || 0, data);
        setResults(data?.schools || []);
      } catch (error) {
        console.error("[SchoolSearch] Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchSchools, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (school: School) => {
    onSelect(school);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none z-10" />
        <Input
          type="text"
          placeholder="Search by school name, city, state, or ZIP..."
          value={query}
          onChange={(e) => {
            console.log('[SchoolSearch] Input changed:', e.target.value);
            setQuery(e.target.value);
          }}
          className="pl-12 pr-10 text-gray-900 bg-white border-gray-300 placeholder:text-gray-400 rounded-lg h-12"
          autoFocus
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {loading && query.length >= 2 && (
        <div className="rounded-lg border border-border shadow-md bg-background">
          <div className="py-6 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        </div>
      )}

      {!loading && results.length === 0 && query.length >= 2 && (
        <div className="rounded-lg border border-border shadow-md bg-background">
          <div className="py-6 text-center text-sm text-muted-foreground">
            No schools found.
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="rounded-lg border border-border shadow-md bg-background">
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 flex items-center justify-between">
              <span>Search Results</span>
              <span className="text-foreground/60">{results.length} {results.length === 1 ? 'school' : 'schools'} found</span>
            </div>
            <div className="space-y-1">
              {results.map((school) => (
                <button
                  key={school.id}
                  onClick={() => handleSelect(school)}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent/50 cursor-pointer transition-colors border border-transparent hover:border-accent"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {highlightMatch(school.name, query)}, {highlightMatch(school.city, query)}, {highlightMatch(school.state, query)}, {highlightMatch(school.zip, query)}
                    </span>
                    {school.school_level && (
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {formatSchoolLevel(school.school_level)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
