import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useCause } from "@/context/CauseContext";
import { supabase } from "@/integrations/supabase/client";
import VistaprintNav from "@/components/VistaprintNav";

type Nonprofit = {
  id: string;
  name: string;
  ein?: string | null;
  city?: string | null;
  state?: string | null;
  description?: string | null;
  source?: string | null;
  irs_status?: string | null;
};

export default function SelectNonprofit() {
  const nav = useNavigate();
  const { setNonprofit, nonprofit } = useCause();
  const [searchParams] = useSearchParams();
  const flow = searchParams.get("flow");

  const [allNonprofits, setAllNonprofits] = useState<Nonprofit[]>([]);
  const [randomNonprofits, setRandomNonprofits] = useState<Nonprofit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedNonprofit, setSelectedNonprofit] = useState<Nonprofit | null>(nonprofit);
  const [searchQuery, setSearchQuery] = useState("");

  // Display nonprofits: random 10 if no search, filtered results if searching
  const displayedNonprofits = searchQuery.trim()
    ? allNonprofits.filter((np) => {
        const query = searchQuery.toLowerCase();
        const name = np.name?.toLowerCase() || "";
        const ein = np.ein?.toLowerCase() || "";
        const city = np.city?.toLowerCase() || "";
        const state = np.state?.toLowerCase() || "";
        const description = np.description?.toLowerCase() || "";
        return name.includes(query) || ein.includes(query) || city.includes(query) || state.includes(query) || description.includes(query);
      })
    : randomNonprofits;

  useEffect(() => {
    document.title = "Choose Your Nonprofit - Print Power Purpose";
    
    let alive = true;
    (async () => {
      try {
        // Fetch all nonprofits for search
        const { data: allData, error: allError } = await supabase
          .from("nonprofits")
          .select("id, name, ein, city, state, description, source, irs_status")
          .eq("approved", true)
          .order("name", { ascending: true });

        if (allError) throw allError;
        if (alive) setAllNonprofits(allData || []);

        // Fetch 10 random nonprofits for initial display
        const { data: randomData, error: randomError } = await supabase
          .from("nonprofits")
          .select("id, name, ein, city, state, description, source, irs_status")
          .eq("approved", true)
          .limit(10);

        if (randomError) throw randomError;
        
        // Shuffle the results client-side for randomness
        const shuffled = (randomData || []).sort(() => Math.random() - 0.5);
        if (alive) setRandomNonprofits(shuffled);
        
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load nonprofits");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function handleNonprofitSelect(np: Nonprofit) {
    setSelectedNonprofit(np);
    setNonprofit(np);
  }

  function handleContinue() {
    if (!selectedNonprofit) return;

    if (flow === "donation") {
      nav("/donate");
    } else {
      nav("/products");
    }
  }

  const body = loading ? (
    <div className="text-center text-muted-foreground py-8">
      <p>Loading nonprofits…</p>
    </div>
  ) : err ? (
    <div className="text-center text-destructive py-8">
      <p>{err}</p>
    </div>
  ) : (
    <>
      {/* Search bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for a Nonprofit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>
        {!searchQuery.trim() && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Showing 10 random nonprofits. Use search to find more.
          </p>
        )}
      </div>

      {/* Nonprofits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedNonprofits.map((np) => {
          const isSelected = selectedNonprofit?.id === np.id;

          return (
            <Card
              key={np.id}
              onClick={() => handleNonprofitSelect(np)}
              className={`
                cursor-pointer p-6 flex flex-col transition-all hover:shadow-lg
                ${
                  isSelected
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                }
              `}
            >
              <h3 className="text-lg font-semibold text-primary mb-2 line-clamp-2">
                {np.name}
              </h3>

              {np.ein && (
                <p className="text-sm text-muted-foreground mb-1">
                  EIN: {np.ein}
                </p>
              )}

              {(np.city || np.state) && (
                <p className="text-sm text-muted-foreground mb-4">
                  {[np.city, np.state].filter(Boolean).join(", ")}
                </p>
              )}

              {np.description && (
                <p className="text-sm text-foreground mb-4 line-clamp-3 flex-grow">
                  {np.description}
                </p>
              )}

              {/* Select Button */}
              <Button
                variant={isSelected ? "default" : "outline"}
                className="w-full mt-auto rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNonprofitSelect(np);
                }}
              >
                {isSelected ? "Selected" : "Select Nonprofit"}
              </Button>
            </Card>
          );
        })}
        {displayedNonprofits.length === 0 && searchQuery.trim() && (
          <div className="col-span-full text-center py-12">
            <p className="text-lg text-foreground">
              No nonprofits found for "{searchQuery}"
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try a different search term
            </p>
          </div>
        )}
      </div>

      {selectedNonprofit && (
        <div className="flex justify-center mt-12">
          <Button onClick={handleContinue} size="lg" className="px-8 rounded-full">
            Continue with {selectedNonprofit.name}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <VistaprintNav />

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <Button onClick={() => nav(-1)} variant="ghost" className="mb-4" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-primary mb-2">
            Select a Nonprofit
          </h1>
          <p className="text-muted-foreground">
            Choose a nonprofit organization to support with your purchase
          </p>
        </div>

        {body}
      </main>
    </div>
  );
}
