import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

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
      return;
    }

    const searchSchools = async () => {
      setLoading(true);
      try {
        console.log('[SchoolSearch] Searching for:', query);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const url = `${supabaseUrl}/functions/v1/schools-search?q=${encodeURIComponent(query)}&limit=20`;
        
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token || '';
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        console.log('[SchoolSearch] Search results:', data?.schools?.length || 0, data);
        setResults(data?.schools || []);
      } catch (error) {
        console.error("Search error:", error);
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
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 relative z-10"
          autoFocus
        />
      </div>

      {(results.length > 0 || (recentSchools.length > 0 && query.length < 2)) && (
        <Command className="rounded-lg border shadow-md relative z-0">
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}

            {!loading && results.length === 0 && query.length >= 2 && (
              <CommandEmpty>No schools found.</CommandEmpty>
            )}

            {!loading && results.length > 0 && (
              <CommandGroup heading="Search Results">
                {results.map((school) => (
                  <CommandItem
                    key={school.id}
                    onSelect={() => handleSelect(school)}
                    className="cursor-pointer"
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
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && query.length < 2 && recentSchools.length > 0 && (
              <CommandGroup heading="Recent Selections">
                {recentSchools.map((school) => (
                  <CommandItem
                    key={school.id}
                    onSelect={() => handleSelect(school)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{school.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {school.city}, {school.state} {school.zip}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      )}
    </div>
  );
}
