import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import DonationBarometer from "../components/DonationBarometer";
import { useCause } from "../context/CauseContext";
import { useToast } from "../ui/Toast";
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
  const { push } = useToast();

  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  const cards = useMemo(
    () =>
      causes.map((c) => {
        const pct = percent(c.raised_cents, c.goal_cents);
        const description = pickBlurb(c) || "";

        const choose = () => {
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
          // Context + toast
          setCause({ id: c.id, name: c.name, summary: description || "" });
          push({ title: "Selected", body: c.name });
          // Navigate to products
          nav("/products");
        };

        return (
          <GlassCard
            key={c.id}
            className="h-full flex flex-col items-center justify-center text-center px-6 py-8 backdrop-blur"
          >
            <h3 className="text-xl font-bold mb-2">{c.name}</h3>

            {description && (
              <p className="text-sm opacity-80 mb-5 max-w-xs">{description}</p>
            )}

            {/* Barometer */}
            <div className="w-3/4 max-w-xs mb-2">
              <DonationBarometer
                raised_cents={c.raised_cents || 0}
                goal_cents={c.goal_cents || 1}
              />
            </div>
            <div className="text-xs opacity-70 mb-5">{pct}% funded</div>

            <button onClick={choose} className="btn-rect mt-1">
              Support this cause
            </button>
          </GlassCard>
        );
      }),
    [causes, nav, push, setCause],
  );

  const body =
    loading ? (
      <GlassCard>
        <p>Loading causes…</p>
      </GlassCard>
    ) : err ? (
      <GlassCard>
        <p className="text-red-600">{err}</p>
      </GlassCard>
    ) : (
      <>
        <h1 className="text-3xl font-bold text-center mb-6 mt-6">Choose a Cause</h1>

        <div
          className="
            grid gap-6
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4
            [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]
          "
        >
          {cards}
        </div>
      </>
    );

  useEffect(() => {
    document.title = "Choose a Cause - Print Power Purpose";
  }, []);

  return (
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a
          href="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen py-12 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-6xl mx-auto">
            {body}
          </div>
        </section>
      </div>
    </div>
  );
}
