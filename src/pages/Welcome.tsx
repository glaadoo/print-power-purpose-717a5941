import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";

export default function Welcome() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Staged reveal logic for Kenzie card
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 150);
    const t2 = setTimeout(() => setStep(2), 1850);
    const t3 = setTimeout(() => setStep(3), 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const paws = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);

  useEffect(() => {
    document.title = "Welcome - Print Power Purpose";

    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load user profile
      if (session.user) {
        setTimeout(() => {
          supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                setUserProfile(data);
              }
              setLoading(false);
            });
        }, 0);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  function onSelect(value: string) {
    if (!value) return;
    if (value === "school") navigate("/select/school");
    else if (value === "nonprofit") navigate("/select/nonprofit");
    else if (value === "personal") navigate("/select/personal");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a
          href="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>

        <div className="flex items-center gap-4">
          {userProfile && (
            <span className="text-sm opacity-90">
              Welcome, {userProfile.first_name}!
            </span>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/auth");
            }}
            className="text-sm px-4 py-2 rounded-full border border-white/30 bg-white/10 hover:bg-white/20"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />

          <div className="relative w-full max-w-5xl mx-auto">
            {/* Welcome message */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow mb-4">
                Welcome{userProfile && ` ${userProfile.first_name}`}
              </h1>
            </div>

            {/* Kenzie onboarding card */}
            <div className="flex justify-center px-4">
              <div className="w-full max-w-[1200px]">
                <GlassCard>
                  {/* paws banner */}
                  <div
                    className="relative w-full h-24 sm:h-32 overflow-hidden"
                    aria-hidden="true"
                  >
                    {paws.map((i) => (
                      <span 
                        key={i} 
                        className="absolute text-3xl sm:text-4xl animate-float"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 3}s`,
                          animationDuration: `${3 + Math.random() * 2}s`
                        }}
                      >
                        🐾
                      </span>
                    ))}
                  </div>

                  <div className="p-6 sm:p-10 text-center space-y-4">
                    {step >= 1 && (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto">
                        <img
                          src="/IMG_4805.jpeg"
                          alt="Kenzie the mascot"
                          className="w-full h-full object-cover rounded-full shadow-lg"
                        />
                      </div>
                    )}

                    <div className="h-2" />
                    {step >= 2 && (
                      <div
                        className="typewriter-nocaret mx-auto text-xl sm:text-3xl"
                        style={{ fontFamily: "'Pacifico', cursive" }}
                      >
                        Hi! I'm your mascot Kenzie 🐾
                      </div>
                    )}
                    {step >= 3 && (
                      <div className="mt-6">
                        <p className="text-gray-800 mb-2 text-lg font-semibold">
                          What are we printing for today?
                        </p>
                        <select
                          defaultValue=""
                          onChange={(e) => onSelect(e.target.value)}
                          className="w-full sm:w-96 rounded-md border border-white/40 bg-white/20 backdrop-blur px-3 py-2 text-gray-800 focus:ring-2"
                          aria-label="Select purpose"
                        >
                          <option value="" disabled className="text-black">
                            Select an option
                          </option>
                          <option value="school" className="text-black">
                            School
                          </option>
                          <option value="nonprofit" className="text-black">
                            Nonprofit
                          </option>
                          <option value="personal" className="text-black">
                            Personal mission
                          </option>
                        </select>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
