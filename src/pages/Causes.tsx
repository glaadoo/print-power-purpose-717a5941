import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DonationBarometer from "../components/DonationBarometer";
import { useCause } from "../context/CauseContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Search } from "lucide-react";
import VistaprintNav from "@/components/VistaprintNav";
import Footer from "@/components/Footer";

const LS_CAUSE = "ppp:cause";

type Cause = {
  id: string;
  name: string;
  blurb?: string | null;
  summary?: string | null;
  goal_cents?: number | null;
  raised_cents?: number | null;
  created_at?: string | null;
  // allow extra fields without breaking
  [key: string]: any;
};

function percent(raised?: number | null, goal?: number | null) {
  if (!goal || goal <= 0) return 0;
  const p = Math.floor(((raised || 0) / goal) * 100);
  return Math.max(0, Math.min(100, p));
}

// Prefer whichever short description field exists
function pickBlurb(c: Cause): string | undefined {
  const candidates = ["blurb", "summary", "description", "about", "subtitle", "notes"];
  for (const k of candidates) {
    const v = c[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

export default function Causes() {
  const nav = useNavigate();
  const { setCause, setNonprofit, nonprofit } = useCause();
  const [searchParams] = useSearchParams();
  const flow = searchParams.get("flow");

  const [allCauses, setAllCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedCause, setSelectedCause] = useState<Cause | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Display causes: first 10 if no search, filtered results if searching
  const displayedCauses = searchQuery.trim() 
    ? allCauses.filter((c) => {
        const query = searchQuery.toLowerCase();
        const name = c.name?.toLowerCase() || "";
        const description = pickBlurb(c)?.toLowerCase() || "";
        return name.includes(query) || description.includes(query);
      })
    : allCauses.slice(0, 10);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Select only columns we expect to exist
        const { data, error } = await supabase
          .from("causes")
          .select("id,name,goal_cents,raised_cents,summary,created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (alive) setAllCauses(data || []);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load causes");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // Subscribe to real-time updates for causes
    const channel = supabase
      .channel('causes-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'causes'
        },
        (payload) => {
          console.log('Cause updated:', payload);
          // Update the specific cause in the list
          setAllCauses(prev => 
            prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
          );
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Client-side search filtering (all causes already loaded)

  const handleCauseClick = (c: Cause) => {
    const description = pickBlurb(c) || "";
    console.log("Cause selected:", c.name, "ID:", c.id, "Flow:", flow);
    setSelectedCause(c);
    // Persist for refresh/other pages
    try {
      localStorage.setItem(
        LS_CAUSE,
        JSON.stringify({
          causeId: c.id,
          causeName: c.name,
          goalCents: c.goal_cents ?? undefined,
          raisedCents: c.raised_cents ?? undefined,
        }),
      );
    } catch {}
    // Context
    setCause({ id: c.id, name: c.name, summary: description || "" });

    // In donation flow, navigate immediately to the donation form
    if (flow === "donation") {
      nav(`/donate?cause=${c.id}`);
    }
  };


  const handleContinue = () => {
    console.log("Continue clicked. Flow:", flow, "Cause:", selectedCause?.name);
    
    if (selectedCause) {
      if (flow === "donation") {
        console.log("Navigating to donation form");
        nav(`/donate?cause=${selectedCause.id}`);
      } else {
        console.log("Navigating to products page");
        nav("/products");
      }
    } else {
      console.log("No cause selected!");
    }
  };

  const body =
    loading ? (
      <div className="text-center text-muted-foreground py-8">
        <p>Loading causes…</p>
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
              placeholder="Search for a Cause..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base"
            />
          </div>
          {!searchQuery.trim() && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Showing first 10 causes. Use search to find more.
            </p>
          )}
        </div>

        {/* Causes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedCauses.map((c) => {
            const description = pickBlurb(c) || "";
            const isSelected = selectedCause?.id === c.id;

            return (
              <Card
                key={c.id}
                onClick={() => handleCauseClick(c)}
                className={`
                  cursor-pointer p-6 flex flex-col transition-all hover:shadow-lg
                  ${
                    isSelected
                      ? "border-primary ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  }
                `}
              >
                <h3 className="text-lg font-semibold text-primary mb-2">{c.name}</h3>
                
                {description && (
                  <p className="text-sm text-foreground mb-4 line-clamp-3 flex-grow">{description}</p>
                )}

                {/* Barometer */}
                <div className="mt-auto">
                  <DonationBarometer
                    raised_cents={c.raised_cents || 0}
                    goal_cents={c.goal_cents || 1}
                  />
                </div>

                {/* Select Button */}
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className="w-full mt-4 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCauseClick(c);
                  }}
                >
                  {isSelected ? "Selected" : "Select Cause"}
                </Button>
              </Card>
            );
          })}
          {displayedCauses.length === 0 && searchQuery.trim() && (
            <div className="col-span-full text-center py-12">
              <p className="text-lg text-foreground">No causes found for "{searchQuery}"</p>
              <p className="text-sm text-muted-foreground mt-2">Try a different search term</p>
            </div>
          )}
        </div>

        {selectedCause && (
          <div className="flex justify-center mt-12">
            <Button
              onClick={handleContinue}
              size="lg"
              className="px-8 rounded-full"
            >
              Continue with {selectedCause.name}
            </Button>
          </div>
        )}
      </>
    );

  useEffect(() => {
    document.title = "Choose a Cause - Print Power Purpose";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <VistaprintNav />

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Page Header */}
        <div className="mb-12 text-center">
          <Button
            onClick={() => nav(-1)}
            variant="ghost"
            className="mb-4"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-primary mb-2">Select a Cause</h1>
          <p className="text-muted-foreground">Choose a cause to support with your purchase</p>
        </div>

        {body}
      </main>
      <Footer />
    </div>
  );
}
