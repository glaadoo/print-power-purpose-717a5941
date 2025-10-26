import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import DonationBarometer from "@/components/DonationBarometer";
import { useCause } from "@/context/CauseContext";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

type Cause = { id: string; name: string; summary?: string; goal_cents: number; raised_cents: number };

export default function SelectNonprofitCause() {
  const nav = useNavigate();
  const { nonprofit } = useParams<{ nonprofit: string }>();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedCause, setSelectedCause] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { setCause } = useCause();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Choose Your Cause - Print Power Purpose";
  }, []);

  useEffect(() => {
    if (!nonprofit) {
      nav("/select/nonprofit");
      return;
    }

    setLoading(true);
    supabase
      .from("causes")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching causes:", error);
          setCauses([]);
        } else {
          setCauses(data || []);
        }
        setLoading(false);
      });
  }, [nonprofit, nav]);

  function handleSubmit() {
    if (!selectedCause || !nonprofit) return;

    const cause = causes.find((c) => c.id === selectedCause);
    if (!cause) return;

    setCause({ id: cause.id, name: cause.name, summary: cause.summary });
    localStorage.setItem(
      "selectedCause",
      JSON.stringify({ 
        type: "nonprofit", 
        nonprofit: decodeURIComponent(nonprofit),
        causeId: cause.id,
        causeName: cause.name
      })
    );

    toast({
      title: "Cause selected!",
      description: `You're now supporting ${cause.name}`,
    });

    nav("/products");
  }

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

        <div className="relative w-full pt-4 pb-8 px-4">
          <div className="w-full max-w-6xl">
            {/* Causes Selection Grid */}
            <div className="mb-24">
              {loading ? (
                <p className="text-center opacity-70">Loading causes...</p>
              ) : causes.length === 0 ? (
                <p className="text-center opacity-70">No causes available</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {causes.map((cause) => (
                    <button
                      key={cause.id}
                      onClick={() => setSelectedCause(cause.id)}
                      className={`rounded-xl border-2 p-6 text-left transition-all duration-300 ${
                        selectedCause === cause.id
                          ? "border-white bg-white/20 scale-105 shadow-lg"
                          : "border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/20 hover:scale-105"
                      }`}
                    >
                      <h4 className="font-semibold mb-2 text-lg">{cause.name}</h4>
                      {cause.summary && (
                        <p className="text-sm opacity-80 mb-3 line-clamp-2">{cause.summary}</p>
                      )}
                      <DonationBarometer
                        raised_cents={cause.raised_cents}
                        goal_cents={cause.goal_cents}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Bottom Bar */}
        {selectedCause && (
          <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-t border-white/20">
            <div className="container mx-auto px-4 py-4 flex justify-center">
              <Button 
                onClick={handleSubmit} 
                variant="outline"
                size="lg" 
                className="px-12 rounded-full border-white/50 bg-transparent text-white hover:bg-white/10"
              >
                <Heart className="w-5 h-5" />
                Continue
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
