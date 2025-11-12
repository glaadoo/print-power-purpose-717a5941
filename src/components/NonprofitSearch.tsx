import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Nonprofit = {
  id: string;
  name: string;
  ein?: string | null;
  city?: string | null;
  state?: string | null;
  source?: string | null;
  irs_status?: string | null;
};

type Props = {
  onSelect: (nonprofit: Nonprofit) => void;
  selectedId?: string | null;
};

export default function NonprofitSearch({ onSelect, selectedId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Nonprofit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchNonprofits(query.trim());
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  async function searchNonprofits(searchQuery: string) {
    setLoading(true);
    try {
      // Search by name or EIN (supports both formats: XX-XXXXXXX or XXXXXXXXX)
      const isEIN = /^\d{2}-?\d{7}$/.test(searchQuery.replace(/-/g, ""));
      
      let queryBuilder = supabase
        .from("nonprofits")
        .select("id, name, ein, city, state, source, irs_status")
        .eq("approved", true);

      if (isEIN) {
        // Format EIN with dash for database query (XX-XXXXXXX)
        const cleanEIN = searchQuery.replace(/-/g, "");
        const formattedEIN = `${cleanEIN.slice(0, 2)}-${cleanEIN.slice(2)}`;
        queryBuilder = queryBuilder.eq("ein", formattedEIN);
      } else {
        // Use case-insensitive search for nonprofit names
        queryBuilder = queryBuilder.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await queryBuilder.limit(20);

      if (error) throw error;
      setResults(data || []);
      setShowResults(true);
    } catch (error) {
      console.error("Nonprofit search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
        <Input
          type="text"
          placeholder="Search nonprofits by name or EIN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setShowResults(true)}
          className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
        />
      </div>

      {showResults && (results.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-2 bg-black/90 backdrop-blur border border-white/30 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-white/60">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                Searching nonprofits...
              </div>
            </div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-white/10">
              {results.map((nonprofit) => (
                <li key={nonprofit.id}>
                  <button
                    onClick={() => {
                      onSelect(nonprofit);
                      setShowResults(false);
                      setQuery("");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white flex items-center gap-2">
                        {nonprofit.name}
                        {selectedId === nonprofit.id && (
                          <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      {nonprofit.ein && (
                        <div className="text-sm text-white/60">EIN: {nonprofit.ein}</div>
                      )}
                      {(nonprofit.city || nonprofit.state) && (
                        <div className="text-sm text-white/60">
                          {[nonprofit.city, nonprofit.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                    {nonprofit.source === 'irs' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 flex-shrink-0">
                        IRS
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-white/60">
              No nonprofits found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
