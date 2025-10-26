import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import VideoBackground from "@/components/VideoBackground";

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
    nav(`/select/school/${encodeURIComponent(school)}/causes`);
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <div className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          SELECT&nbsp;SCHOOL
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

        <div className="relative w-full py-8 px-4">
          <div className="w-full max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-8">
              Select School
            </h2>

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
