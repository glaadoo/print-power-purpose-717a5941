import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { ArrowLeft, User } from "lucide-react";
import Footer from "@/components/Footer";
import kenzieMascot from "@/assets/kenzie-power-mascot.jpg";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";

export default function Welcome() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  

  // Staged reveal logic for kenzie-AI card
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

  

  useEffect(() => {
    document.title = "Welcome - Print Power Purpose";

    // Function to load user profile with timeout
    const loadUserProfile = async (userId: string) => {
      try {
        // Set timeout to 5 seconds
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile load timeout')), 5000)
        );
        
        const fetchPromise = supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (!error && data) {
          setUserProfile(data);
        } else if (error) {
          console.error("Error loading profile:", error);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        // Continue anyway - user can still proceed without profile data
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
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-foreground backdrop-blur bg-[#f5f5f0]/90 border-b border-border/20">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-black/5 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        <Link
          to="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </Link>
      </header>

      {/* Fullscreen content */}
      <div className="min-h-screen w-full pt-0 relative">

        {/* Content */}
        <div className="relative min-h-[calc(100svh-64px)] flex items-center justify-center px-4 py-0 -mt-3 sm:-mt-4">
          <div className="w-full max-w-5xl mx-auto">

            {/* kenzie-AI onboarding card */}
            <div className="flex justify-center px-4">
              <div className="w-full max-w-[1200px]">
                <div className="p-3 sm:p-4">

                  <div className="text-center space-y-2">
                    {/* Profile Picture Section */}
                    {session?.user && (
                      <div className="mb-6">
                        <ProfilePictureUpload
                          userId={session.user.id}
                          currentAvatarUrl={userProfile?.avatar_url || null}
                          onAvatarUpdated={(url) => {
                            setUserProfile((prev: any) => ({ ...prev, avatar_url: url || null }));
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Kenzie Mascot for guests */}
                    {!session?.user && step >= 1 && (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4">
                        <img
                          src={kenzieMascot}
                          alt="kenzie-AI the mascot"
                          className="w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}

                    <h1 className="font-serif text-[clamp(2rem,4.5vw,3.2rem)] leading-tight font-semibold text-[#1a3a2f]">
                      {`Welcome${displayName ? `, ${displayName}` : ""}`}
                    </h1>
                    {step >= 2 && (
                      <div
                        className="typewriter-nocaret mx-auto text-lg sm:text-2xl text-[#1a3a2f]"
                        style={{ fontFamily: "'Pacifico', cursive" }}
                      >
                        Hi! I'm your mascot kenzie-AI 🐾
                      </div>
                    )}
                    {step >= 3 && (
                      <div className="mt-1">
                        <p className="text-gray-800 mb-4 text-base sm:text-lg leading-relaxed max-w-md mx-auto font-medium">
                          Your print purchase powers nonprofits.<br />
                          Ready to make a change?
                        </p>
                        <button
                          onClick={() => {
                            localStorage.setItem("ppp_access", session?.user ? "user" : "guest");
                            navigate("/select/nonprofit");
                          }}
                          className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg"
                        >
                          Choose Your Cause
                        </button>
                      </div>
                    )}
                </div>
              </div>
              {/* Spacer for footer clearance */}
              <div className="h-24 md:h-32" />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
    </div>
  );
}
