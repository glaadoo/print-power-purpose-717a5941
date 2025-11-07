import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const SCHOOLS = [
  "Lincoln High School",
  "Roosevelt STEM Academy",
  "Westview Senior Class",
  "Hillside Elementary PTA",
];

export default function SelectSchool() {
  const nav = useNavigate();
  const [selectedSchool, setSelectedSchool] = useState<string>("");

  useEffect(() => {
    document.title = "Choose Your School - Print Power Purpose";
  }, []);

  function handleSchoolSelect(school: string) {
    setSelectedSchool(school);
    nav('/causes');
  }

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
          SELECT&nbsp;SCHOOL
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

        <div className="relative w-full pt-4 pb-8 px-4">
          <div className="w-full max-w-6xl">
            {/* School Selection Grid */}
            <div className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {SCHOOLS.map((school) => (
                  <button
                    key={school}
                    onClick={() => handleSchoolSelect(school)}
                    className="aspect-square rounded-xl border-2 p-4 flex items-center justify-center text-center transition-all border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15 hover:scale-105"
                  >
                    <span className="font-medium text-sm md:text-base">{school}</span>
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
