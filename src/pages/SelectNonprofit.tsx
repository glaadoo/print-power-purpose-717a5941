import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import VideoBackground from "@/components/VideoBackground";

const NONPROFITS = [
  "Red Cross Local Chapter",
  "Community Food Bank",
  "Neighborhood Animal Rescue",
  "Green Earth Society",
];

export default function SelectNonprofit() {
  const nav = useNavigate();

  useEffect(() => {
    document.title = "Choose Your Nonprofit - Print Power Purpose";
  }, []);

  function handleNonprofitSelect(nonprofit: string) {
    nav(`/select/nonprofit/${encodeURIComponent(nonprofit)}/causes`);
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <div className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          SELECT&nbsp;A&nbsp;NONPROFIT
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

        <div className="relative w-full pt-4 pb-8 px-4">
          <div className="w-full max-w-6xl">
            {/* Nonprofit Selection Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {NONPROFITS.map((nonprofit) => (
                  <button
                    key={nonprofit}
                    onClick={() => handleNonprofitSelect(nonprofit)}
                    className="aspect-square rounded-xl border-2 p-4 flex items-center justify-center text-center transition-all border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15 hover:scale-105"
                  >
                    <span className="font-medium text-sm md:text-base">{nonprofit}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
