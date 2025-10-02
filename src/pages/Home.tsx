import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const nav = useNavigate();

  // staged reveal
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 150);
    const t2 = setTimeout(() => setStep(2), 1850);
    const t3 = setTimeout(() => setStep(3), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Long row of paws to cover the whole width; staggered via inline style
  const paws = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);

  function onSelect(value: string) {
    if (!value) return;
    if (value === "school") nav("/select/school");
    else if (value === "nonprofit") nav("/select/nonprofit");
    else if (value === "personal") nav("/select/personal");
  }

  return (
    <Layout title="Home" showHeader={false}>
      <div className="w-full max-w-4xl">
        <GlassCard>
          {/* Full-width paws banner inside card */}
          <div className="relative h-10 sm:h-12 mb-4 overflow-hidden">
            <div className="absolute inset-0 flex items-center gap-3">
              {paws.map((n) => (
                <span
                  key={n}
                  className={`paws-row ${n % 2 ? "paws-muted" : ""}`}
                  style={{ animationDelay: `${(n % 6) * 0.12}s` }}
                >
                  🐾
                </span>
              ))}
            </div>
          </div>

          <div className="text-center">
            {/* 1) Welcome (no caret, fancy style) */}
            {step >= 1 && (
              <h1 className="typewriter-nocaret heading-fancy text-3xl sm:text-5xl">
                Welcome to Print with Purpose
              </h1>
            )}

            {/* spacing to keep layout stable */}
            <div className="h-2" />

            {/* 2) Kenzie line in cursive, no caret */}
            {step >= 2 && (
              <div
                className="typewriter-nocaret mx-auto text-2xl sm:text-4xl"
                style={{ fontFamily: "'Pacifico', cursive" }}
              >
                I am your mascot Kenzie
              </div>
            )}

            {/* 3) Question + dropdown */}
            {step >= 3 && (
              <div className="mt-6">
                <p className="text-gray-800 mb-2">What are we printing for today?</p>
                <select
                  defaultValue=""
                  onChange={(e) => onSelect(e.target.value)}
                  className="w-full sm:w-96 rounded-md border border-white/40 bg-white/20 backdrop-blur px-3 py-2 focus:ring-2"
                  aria-label="Select purpose"
                >
                  <option value="" disabled>Select an option</option>
                  <option value="school">School</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="personal">Personal mission</option>
                </select>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}

