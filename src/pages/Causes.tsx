import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DonationBarometer from "../components/DonationBarometer";
import { useCause } from "../context/CauseContext";
import { supabase } from "@/lib/supabase";
import VideoBackground from "@/components/VideoBackground";

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
    return () => {
      alive = false;
    };
  }, []);

  const handleCauseClick = (c: Cause) => {
    const description = pickBlurb(c) || "";
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
  };

  const handleContinue = () => {
    if (selectedCause) {
      nav("/products");
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
    );

  useEffect(() => {
    document.title = "Choose a Cause - Print Power Purpose";
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <div className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          SELECT&nbsp;CAUSE
        </div>
      </header>

      {/* Fullscreen content */}
      <div className="h-full w-full pt-16 overflow-y-auto">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />

        <div className="relative w-full pt-4 pb-32 px-4">
          <div className="w-full max-w-6xl mx-auto">
            {body}
          </div>
        </div>
      </div>

      {/* Floating Continue Bar */}
      {selectedCause && (
        <div className="fixed bottom-0 inset-x-0 z-50 px-4 md:px-6 py-4 flex items-center justify-center gap-4 text-white backdrop-blur-md bg-black/40 border-t border-white/20 pointer-events-none">
          <button
            onClick={handleContinue}
            className="pointer-events-auto px-6 py-4 rounded-full bg-white/20 text-white font-semibold hover:bg-white/30 border border-white/50 shadow-lg backdrop-blur-sm text-sm whitespace-nowrap"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
