import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import DonationBarometer from "@/components/DonationBarometer";
import { useCause } from "@/context/CauseContext";
import { useToast } from "@/hooks/use-toast";

const SCHOOLS = [
  "Lincoln High School",
  "Roosevelt STEM Academy",
  "Westview Senior Class",
  "Hillside Elementary PTA",
];

type Cause = { id: string; name: string; summary?: string; goal_cents: number; raised_cents: number };

export default function SelectSchool() {
  const nav = useNavigate();
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedCause, setSelectedCause] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { setCause } = useCause();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Choose Your School - Print Power Purpose";
  }, []);

  useEffect(() => {
    if (!selectedSchool) {
      setCauses([]);
      setSelectedCause("");
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
  }, [selectedSchool]);

  function handleSubmit() {
    if (!selectedSchool || !selectedCause) return;

    const cause = causes.find((c) => c.id === selectedCause);
    if (!cause) return;

    setCause({ id: cause.id, name: cause.name, summary: cause.summary });
    localStorage.setItem(
      "selectedCause",
      JSON.stringify({ 
        type: "school", 
        school: selectedSchool,
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
        <a
          href="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      {/* Fullscreen content */}
      <div className="h-full w-full pt-16 overflow-y-auto">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />

        <div className="relative min-h-full flex flex-col items-center justify-center py-8 px-4">
          <div className="w-full max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-center mb-2">
              Select Your School and Cause
            </h2>
            <p className="text-center text-white/80 mb-8">Choose your school, then select a cause to support</p>

            {/* School Selection Grid */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-center">Which school do you represent?</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {SCHOOLS.map((school) => (
                  <button
                    key={school}
                    onClick={() => setSelectedSchool(school)}
                    className={`aspect-square rounded-xl border-2 p-4 flex items-center justify-center text-center transition-all ${
                      selectedSchool === school
                        ? "border-white bg-white/20 scale-105 shadow-lg"
                        : "border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15"
                    }`}
                  >
                    <span className="font-medium text-sm md:text-base">{school}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Causes Selection Grid */}
            {selectedSchool && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-center">Select a cause to support</h3>
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
                        className={`rounded-xl border-2 p-6 text-left transition-all ${
                          selectedCause === cause.id
                            ? "border-white bg-white/20 scale-105 shadow-lg"
                            : "border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15"
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
            )}

            {/* Continue Button */}
            {selectedSchool && selectedCause && (
              <div className="flex justify-center">
                <Button onClick={handleSubmit} size="lg" className="px-12">
                  Continue to Products
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
