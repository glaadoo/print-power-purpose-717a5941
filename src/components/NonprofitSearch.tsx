import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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

const RECENT_NONPROFITS_KEY = "ppp_recent_nonprofits";
const MAX_RECENT = 6;

export default function NonprofitSearch({ onSelect, selectedId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Nonprofit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentNonprofits, setRecentNonprofits] = useState<Nonprofit[]>([]);

  // Load recent nonprofits from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_NONPROFITS_KEY);
      if (stored) {
        setRecentNonprofits(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading recent nonprofits:", error);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchNonprofits(query.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function searchNonprofits(searchQuery: string) {
    setLoading(true);
    try {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      
      let queryBuilder = supabase
        .from("nonprofits")
        .select("id, name, ein, city, state, source, irs_status")
        .eq("approved", true);

      if (normalizedQuery === "") {
        // Empty query - show default curated nonprofits
        queryBuilder = queryBuilder
          .eq("source", "curated")
          .order("name")
          .limit(25);
      } else {
        // Prefix search using the search_name field
        queryBuilder = queryBuilder
          .ilike("search_name", `${normalizedQuery}%`)
          .order("name")
          .limit(25);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error("Nonprofit search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function saveToRecentNonprofits(nonprofit: Nonprofit) {
    try {
      // Remove any existing entry with same id
      const filtered = recentNonprofits.filter((n) => n.id !== nonprofit.id);
      // Prepend new nonprofit
      const updated = [nonprofit, ...filtered].slice(0, MAX_RECENT);
      // Save to localStorage
      localStorage.setItem(RECENT_NONPROFITS_KEY, JSON.stringify(updated));
      setRecentNonprofits(updated);
    } catch (error) {
      console.error("Error saving recent nonprofit:", error);
    }
  }

  function handleSelect(nonprofit: Nonprofit) {
    saveToRecentNonprofits(nonprofit);
    onSelect(nonprofit);
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
        <Input
          type="text"
          placeholder="Search nonprofits by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
        />
      </div>

      {/* Quick Select - Recent Nonprofits */}
      {recentNonprofits.length > 0 && (
        <div>
          <p className="text-xs text-white/60 mb-2">Recent Selections</p>
          <div className="flex flex-wrap gap-2">
            {recentNonprofits.map((nonprofit) => (
              <button
                key={nonprofit.id}
                onClick={() => handleSelect(nonprofit)}
                className="
                  rounded-full
                  bg-white/10
                  backdrop-blur-md
                  border border-white/20
                  px-3 py-1
                  text-xs text-white
                  hover:bg-white/20
                  transition
                "
              >
                {nonprofit.name} • {nonprofit.state}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      {loading ? (
        <div className="p-4 text-center text-white/60">
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
            Searching nonprofits...
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="mt-4 flex flex-col space-y-3">
          {results.map((nonprofit) => (
            <div
              key={nonprofit.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(nonprofit)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(nonprofit);
                }
              }}
              aria-selected={selectedId === nonprofit.id}
              className={`
                w-full rounded-xl backdrop-blur-md border px-4 py-3 cursor-pointer
                transition transform animate-enter flex flex-col
                hover:bg-white/15 hover:border-white/25 hover:-translate-y-0.5 hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-white/60
                ${selectedId === nonprofit.id
                  ? "scale-105 bg-white/20 border-white/40 ring-2 ring-white/60 shadow-lg"
                  : "bg-white/10 border-white/15 shadow-md"}
              `}
            >
              <div className="text-base font-semibold text-white">{nonprofit.name}</div>
              {nonprofit.ein && (
                <div className="text-xs text-white/70 mt-1">EIN: {nonprofit.ein}</div>
              )}
              {(nonprofit.city || nonprofit.state) && (
                <div className="text-xs text-white/70">
                  {[nonprofit.city, nonprofit.state].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : query.trim() !== "" ? (
        <div className="p-4 text-center text-white/60">
          No nonprofits found
        </div>
      ) : null}
    </div>
  );
}
