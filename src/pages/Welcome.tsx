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
                Welcome to Print Power Purpose
                {userProfile && `, ${userProfile.first_name}`}!
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                We've saved your information so checkout will be seamless. Let's get started with your first order.
              </p>
            </div>

            {/* Kenzie onboarding card */}
            <div className="flex justify-center px-4">
              <div className="w-full max-w-[1200px]">
                <GlassCard>
                  {/* paws banner */}
                  <div
                    className="
                      w-full h-12 sm:h-14
                      bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400
                      flex items-center justify-center gap-1 sm:gap-2
                      overflow-hidden
                    "
                    aria-hidden="true"
                  >
                    {paws.map((i) => (
                      <span key={i} className="text-xl sm:text-2xl opacity-80">
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
                        <p className="text-sm text-gray-600 mt-3">
                          Don't worry, you can always change this later or browse our products directly.
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-12 text-center">
              <p className="text-sm opacity-80 mb-4">Or explore on your own:</p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/products"
                  className="px-6 py-3 rounded-full bg-white/10 border border-white/30 hover:bg-white/20 backdrop-blur font-semibold transition-all"
                >
                  Browse Products
                </a>
                <a
                  href="/causes"
                  className="px-6 py-3 rounded-full bg-white/10 border border-white/30 hover:bg-white/20 backdrop-blur font-semibold transition-all"
                >
                  View Causes
                </a>
                <a
                  href="/"
                  className="px-6 py-3 rounded-full bg-white/10 border border-white/30 hover:bg-white/20 backdrop-blur font-semibold transition-all"
                >
                  Go to Home
                </a>
              </div>
            </div>

            {/* User info card (optional, to show saved data) */}
            {userProfile && (
              <div className="mt-12 rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8 max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  Your Saved Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <InfoItem label="Name" value={`${userProfile.first_name} ${userProfile.last_name}`} />
                  {userProfile.phone && <InfoItem label="Phone" value={userProfile.phone} />}
                  <InfoItem
                    label="Shipping Address"
                    value={`${userProfile.street_address}, ${userProfile.city}, ${userProfile.state} ${userProfile.zip_code}`}
                    colSpan
                  />
                </div>
                <p className="text-xs opacity-70 text-center mt-4">
                  This information will be used for faster checkout. You can update it anytime in your profile.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoItem({ label, value, colSpan }: { label: string; value: string; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "sm:col-span-2" : ""}>
      <div className="opacity-70 mb-1">{label}:</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
