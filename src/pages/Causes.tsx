import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DonationBarometer from "../components/DonationBarometer";
import { useCause } from "../context/CauseContext";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
  const { setCause } = useCause();
  const [searchParams] = useSearchParams();
  const flow = searchParams.get("flow");

  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedCause, setSelectedCause] = useState<Cause | null>(null);

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
        if (alive) setCauses(data || []);
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
          setCauses(prev => 
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
    console.log("Continue clicked. Flow:", flow, "Selected cause:", selectedCause?.name);
    if (selectedCause) {
      // If coming from donation flow, go to donation form; otherwise go to products
      if (flow === "donation") {
        console.log("Navigating to donation form with cause:", selectedCause.id);
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
      <div className="text-center text-white/80 py-8">
        <p>Loading causes…</p>
      </div>
    ) : err ? (
      <div className="text-center text-red-400 py-8">
        <p>{err}</p>
      </div>
    ) : (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {causes.map((c) => {
            const description = pickBlurb(c) || "";
            const isSelected = selectedCause?.id === c.id;

            return (
              <button
                key={c.id}
                onClick={() => handleCauseClick(c)}
                className={`
                  aspect-square rounded-xl border-2 p-4 flex flex-col items-center justify-center text-center transition-all
                  ${
                    isSelected
                      ? "border-white/70 bg-white/25 scale-105"
                      : "border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15 hover:scale-105"
                  }
                `}
              >
                <h3 className="text-base md:text-lg font-bold mb-2">{c.name}</h3>
                
                {description && (
                  <p className="text-xs md:text-sm opacity-80 mb-3 line-clamp-3">{description}</p>
                )}

                {/* Barometer */}
                <div className="w-full max-w-[120px]">
                  <DonationBarometer
                    raised_cents={c.raised_cents || 0}
                    goal_cents={c.goal_cents || 1}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {selectedCause && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleContinue}
              className="px-8 py-4 rounded-full bg-white/20 text-white font-semibold hover:bg-white/30 border border-white/50 shadow-lg backdrop-blur-sm text-base"
            >
              Continue
            </button>
          </div>
        )}
      </>
    );

  useEffect(() => {
    document.title = "Choose a Cause - Print Power Purpose";
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10 relative">
        <Button
          onClick={() => nav(-1)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="absolute left-1/2 -translate-x-1/2 tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          SELECT&nbsp;CAUSE
        </div>
        
        <div className="w-20" /> {/* Spacer for centering */}
      </header>

      {/* Fullscreen content */}
      <div className="h-full w-full pt-16 overflow-y-auto">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />

        <div className="relative w-full min-h-full pt-4 pb-32 px-4">
          <div className="w-full max-w-6xl mx-auto">
            {body}
          </div>
        </div>
      </div>

    </div>
  );
}
