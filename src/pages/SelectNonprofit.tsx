import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONPROFITS = [
  "Red Cross Local Chapter",
  "Community Food Bank",
  "Neighborhood Animal Rescue",
  "Green Earth Society",
];

type Cause = {
  id: string;
  name: string;
  summary?: string | null;
};

export default function SelectNonprofit() {
  const nav = useNavigate();
  const [selectedNonprofit, setSelectedNonprofit] = useState<string>("");
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedCause, setSelectedCause] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Choose Your Nonprofit - Print Power Purpose";
  }, []);

  useEffect(() => {
    if (!selectedNonprofit) {
      setCauses([]);
      setSelectedCause("");
      return;
    }

    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("causes")
          .select("id,name,summary")
          .order("name", { ascending: true });

        if (error) throw error;
        if (alive) setCauses(data || []);
      } catch (e) {
        console.error("Failed to load causes:", e);
        if (alive) setCauses([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedNonprofit]);

  function handleSubmit() {
    if (!selectedNonprofit || !selectedCause) return;
    
    const cause = causes.find(c => c.id === selectedCause);
    if (!cause) return;

    localStorage.setItem(
      "selectedCause",
      JSON.stringify({ 
        type: "nonprofit", 
        nonprofit: selectedNonprofit,
        causeId: cause.id,
        causeName: cause.name 
      })
    );
    nav("/products");
  }

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
        <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-3xl mx-auto">
            <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8">
              <h2 className="text-3xl font-serif font-semibold text-center mb-8">
                Choose Your Nonprofit
              </h2>

              <div className="flex flex-col gap-6">
                {/* Nonprofit Dropdown */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Select Nonprofit</label>
                  <Select value={selectedNonprofit} onValueChange={setSelectedNonprofit}>
                    <SelectTrigger className="w-full bg-white/90 text-black border-white/30">
                      <SelectValue placeholder="Choose a nonprofit..." />
                    </SelectTrigger>
                    <SelectContent side="bottom" sideOffset={8} className="bg-white z-[60] max-h-[300px]">
                      {NONPROFITS.map((n) => (
                        <SelectItem key={n} value={n} className="text-black">
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Causes Dropdown - Only shown when nonprofit is selected */}
                {selectedNonprofit && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Select Cause</label>
                    {loading ? (
                      <div className="w-full px-6 py-3 rounded-xl bg-white/50 text-black text-center">
                        Loading causes...
                      </div>
                    ) : causes.length > 0 ? (
                      <Select value={selectedCause} onValueChange={setSelectedCause}>
                        <SelectTrigger className="w-full bg-white/90 text-black border-white/30">
                          <SelectValue placeholder="Choose a cause..." />
                        </SelectTrigger>
                         <SelectContent side="bottom" sideOffset={8} className="bg-white z-[60] max-h-[300px]">
                          {causes.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-black">
                              {c.name}
                              {c.summary && (
                                <span className="block text-xs text-gray-600 mt-1">
                                  {c.summary}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="w-full px-6 py-3 rounded-xl bg-white/50 text-black text-center">
                        No causes available
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                {selectedNonprofit && selectedCause && (
                  <button
                    onClick={handleSubmit}
                    className="w-full px-6 py-4 rounded-xl bg-white/90 text-black font-semibold text-lg hover:bg-white transition-colors mt-4"
                  >
                    Continue to Products
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
