import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import VideoBackground from "@/components/VideoBackground";
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

    // Function to load user profile
    const loadUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        
        if (!error && data) {
          setUserProfile(data);
        } else if (error) {
          console.error("Error loading profile:", error);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setUserProfile(null);
        setLoading(false);
      } else if (session.user) {
        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => {
          loadUserProfile(session.user.id);
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setUserProfile(null);
        setLoading(false);
      } else if (session.user) {
        loadUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayName = useMemo(() => {
    const p = userProfile;
    const u = session?.user;
    const fromMeta = (u?.user_metadata as any) || {};
    return (
      p?.first_name ||
      fromMeta.first_name ||
      (fromMeta.full_name ? String(fromMeta.full_name).split(" ")[0] : undefined) ||
      (u?.email ? String(u.email).split("@")[0] : undefined) ||
      ""
    );
  }, [userProfile, session]);

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
    <div className="min-h-screen text-white">
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

        <Link
          to="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </Link>
      </header>

      {/* Fullscreen content with animated paws background */}
      <div className="min-h-screen w-full pt-0 relative">
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
        <div className="relative min-h-[calc(100svh-64px)] flex items-center justify-center px-4 py-0 -mt-3 sm:-mt-4">
          <div className="w-full max-w-5xl mx-auto">

            {/* Kenzie onboarding card */}
            <div className="flex justify-center px-4">
              <div className="w-full max-w-[1200px]">
                <div className="p-3 sm:p-4">
                  {/* paws banner */}
                  <div
                    className="relative w-full h-8 sm:h-10 overflow-hidden"
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

                  <div className="text-center space-y-2">
                    {step >= 1 && (
                      <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto">
                        <img
                          src="/IMG_4805.jpeg"
                          alt="Kenzie the mascot"
                          className="w-full h-full object-cover rounded-full shadow-lg"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}

                    <h1 className="font-serif text-[clamp(2rem,4.5vw,3.2rem)] leading-tight font-semibold drop-shadow">
                      {`Welcome${displayName ? `, ${displayName}` : ""}`}
                    </h1>
                    {step >= 2 && (
                      <div
                        className="typewriter-nocaret mx-auto text-lg sm:text-2xl"
                        style={{ fontFamily: "'Pacifico', cursive" }}
                      >
                        Hi! I'm your mascot Kenzie 🐾
                      </div>
                    )}
                    {step >= 3 && (
                      <div className="mt-1">
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
