import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
                Select Your School and Cause
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Which school do you represent?</label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger className="w-full bg-white/20 border-white/30 text-white">
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-white/20 z-50">
                      {SCHOOLS.map((school) => (
                        <SelectItem key={school} value={school}>
                          {school}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSchool && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Select a cause to support</label>
                    {loading ? (
                      <p className="text-sm opacity-70">Loading causes...</p>
                    ) : causes.length === 0 ? (
                      <p className="text-sm opacity-70">No causes available</p>
                    ) : (
                      <div className="space-y-4">
                        {causes.map((cause) => (
                          <div
                            key={cause.id}
                            className={`border rounded-lg p-4 cursor-pointer transition ${
                              selectedCause === cause.id
                                ? "border-white bg-white/20"
                                : "border-white/30 hover:border-white/50"
                            }`}
                            onClick={() => setSelectedCause(cause.id)}
                          >
                            <h3 className="font-semibold mb-2">{cause.name}</h3>
                            {cause.summary && (
                              <p className="text-sm opacity-80 mb-3">{cause.summary}</p>
                            )}
                            <DonationBarometer
                              raised_cents={cause.raised_cents}
                              goal_cents={cause.goal_cents}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedSchool && selectedCause && (
                  <Button onClick={handleSubmit} className="w-full">
                    Continue to Products
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
