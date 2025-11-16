import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import { ArrowLeft } from "lucide-react";
import NonprofitSearch from "@/components/NonprofitSearch";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { useCause } from "@/context/CauseContext";

export default function SelectNonprofit() {
  const nav = useNavigate();
  const { setNonprofit, nonprofit } = useCause();
  const [searchParams] = useSearchParams();
  const flow = searchParams.get("flow");
  const [selectedNonprofit, setSelectedNonprofit] = useState<any | null>(nonprofit);

  useEffect(() => {
    document.title = "Choose Your Nonprofit - Print Power Purpose";
  }, []);

  function handleNonprofitSelect(np: any) {
    setSelectedNonprofit(np);
    setNonprofit(np);
  }

  function handleContinue() {
    if (flow === "donate" && selectedNonprofit) {
      nav("/donate");
    } else if (selectedNonprofit) {
      nav("/products");
    }
  }

  return (
    <>
      {/* Fixed header */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <button onClick={() => nav('/')} className="hover:opacity-80 transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          SELECT A NONPROFIT
        </div>
        <div className="w-5" />
      </header>

      {/* Fixed bottom header with Continue button */}
      {selectedNonprofit && (
        <header className="fixed bottom-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-t border-white/10">
          <Button
            onClick={handleContinue}
            size="lg"
            className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold px-8"
          >
            Continue
          </Button>
        </header>
      )}

      {/* Fullscreen content */}
      <div className="fixed inset-0 w-screen h-screen overflow-hidden">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />

        <div className="relative w-full h-full pt-16 pb-20 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto px-4 space-y-6">
            {/* Nonprofit Search Section */}
            <GlassCard className="w-full" padding="p-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    Select a Nonprofit
                  </h2>
                  <p className="text-white/70 text-sm">
                    Search for a specific nonprofit organization
                  </p>
                </div>
                <NonprofitSearch
                  onSelect={handleNonprofitSelect}
                  selectedId={selectedNonprofit?.id}
                />
                {selectedNonprofit && (
                  <div className="mt-4 p-4 bg-white/10 rounded-lg border border-white/20">
                    <p className="text-white font-medium">{selectedNonprofit.name}</p>
                    {selectedNonprofit.ein && (
                      <p className="text-white/60 text-sm">EIN: {selectedNonprofit.ein}</p>
                    )}
                    {(selectedNonprofit.city || selectedNonprofit.state) && (
                      <p className="text-white/60 text-sm">
                        {[selectedNonprofit.city, selectedNonprofit.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </>
  );
}
