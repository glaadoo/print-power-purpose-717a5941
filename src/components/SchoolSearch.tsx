import { useState, useEffect } from "react";
import { Search } from "lucide-react";
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
  const [recentSchools, setRecentSchools] = useState<School[]>([]);

  useEffect(() => {
    const recent = localStorage.getItem("recent_schools");
    if (recent) {
      try {
        setRecentSchools(JSON.parse(recent));
      } catch (e) {
        console.error("Failed to parse recent schools", e);
      }
    }
  }, []);

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

  const saveToRecentSchools = (school: School) => {
    const recent = [school, ...recentSchools.filter(s => s.id !== school.id)].slice(0, 5);
    localStorage.setItem("recent_schools", JSON.stringify(recent));
    setRecentSchools(recent);
  };

  const handleSelect = (school: School) => {
    saveToRecentSchools(school);
    onSelect(school);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search by school name, city, state, or ZIP..."
          value={query}
          onChange={(e) => {
            console.log('[SchoolSearch] Input changed:', e.target.value);
            setQuery(e.target.value);
          }}
          className="pl-10 text-foreground bg-background caret-foreground"
          autoFocus
        />
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
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              Search Results
            </div>
            <div className="space-y-1">
              {results.map((school) => (
                <button
                  key={school.id}
                  onClick={() => handleSelect(school)}
                  className="w-full text-left px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{school.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {school.city}, {school.state} {school.zip}
                    </span>
                    {school.district && (
                      <span className="text-xs text-muted-foreground">
                        {school.district}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && query.length < 2 && recentSchools.length > 0 && (
        <div className="rounded-lg border border-border shadow-md bg-background">
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              Recent Selections
            </div>
            <div className="space-y-1">
              {recentSchools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => handleSelect(school)}
                  className="w-full text-left px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{school.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {school.city}, {school.state} {school.zip}
                    </span>
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
