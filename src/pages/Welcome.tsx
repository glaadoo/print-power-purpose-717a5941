import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import MenuOverlay from "@/components/MenuOverlay";
import useToggle from "@/hooks/useToggle";
import { Menu } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { open: menuOpen, toggle: toggleMenu } = useToggle(false);

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

    // Allow guest mode: don't redirect to /auth when no session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Load user profile for signed-in users
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
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Stay on page in guest mode
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <div className="fixed inset-0 w-screen h-screen overflow-y-auto text-white">
      {/* Menu Overlay */}
      <MenuOverlay open={menuOpen} onClose={toggleMenu} showSignOut={!!session} />

      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <button
          onClick={toggleMenu}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <a
          href="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      {/* Fullscreen content with animated paws background */}
      <div className="h-full w-full pt-24 relative">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/40" />}
        />

        {/* Animated paws all over the background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {paws.map((i) => (
            <span 
              key={i} 
              className="absolute text-4xl md:text-5xl lg:text-6xl animate-float opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${4 + Math.random() * 4}s`
              }}
            >
              🐾
            </span>
          ))}
        </div>

        {/* Content */}
        <div className="relative h-full flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-5xl mx-auto">

            {/* Kenzie onboarding card */}
            <div className="flex justify-center px-4">
              <div className="w-full max-w-[1200px]">
                <GlassCard>
                  {/* paws banner */}
                  <div
                    className="relative w-full h-24 sm:h-32 overflow-hidden"
                    aria-hidden="true"
                  >
                    {paws.slice(0, 10).map((i) => (
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

                    <h1 className="font-serif text-[clamp(2.2rem,5vw,3.8rem)] leading-tight font-semibold drop-shadow mb-2">
                      Welcome{userProfile && ` ${userProfile.first_name}`}
                    </h1>
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
        </div>
      </div>
    </div>
  );
}
