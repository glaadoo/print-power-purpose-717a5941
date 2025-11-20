import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";

import GlassCard from "../components/GlassCard";
import VideoBackground from "@/components/VideoBackground";
import MenuOverlay from "@/components/MenuOverlay";
import ScrollDots from "@/components/ScrollDots";
import MascotHeader from "@/components/MascotHeader";
import ColorSelector from "@/components/ColorSelector";
import useToggle from "@/hooks/useToggle";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const menu = useToggle(false);

  // Real stats from database
  const [stats, setStats] = useState({
    totalRaised: 0,
    organizationCount: 0,
    orderCount: 0,
  });

  // Featured story/video state
  const [featuredStory, setFeaturedStory] = useState<{
    video_url: string | null;
    cause_id: string | null;
  } | null>(null);

  // Set document title
  useEffect(() => {
    document.title = "Home - Print Power Purpose";
  }, []);

  // Handle payment success from donation page
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success("Thank you for your donation! Your payment was successful.");
      
      // Clean up URL by removing payment params using React Router
      nav("/", { replace: true });
    }
  }, [searchParams, nav]);

  // Fetch real stats from database
  useEffect(() => {
    async function loadStats() {
      try {
        // Get total donations
        const { data: donations } = await supabase
          .from("donations")
          .select("amount_cents");
        const totalRaised = donations?.reduce((sum, d) => sum + (d.amount_cents || 0), 0) || 0;

        // Get organization counts
        const [
          { count: nonprofitCount },
          { count: schoolCount },
          { count: causeCount },
        ] = await Promise.all([
          supabase.from("nonprofits").select("*", { count: "exact", head: true }),
          supabase.from("schools").select("*", { count: "exact", head: true }),
          supabase.from("causes").select("*", { count: "exact", head: true }),
        ]);

        // Get order count
        const { count: orderCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true });

        setStats({
          totalRaised,
          organizationCount: (nonprofitCount || 0) + (schoolCount || 0) + (causeCount || 0),
          orderCount: orderCount || 0,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    }

    loadStats();

    // Load featured story
    async function loadFeaturedStory() {
      try {
        const { data } = await supabase
          .from("story_requests")
          .select("video_url, cause_id")
          .not("video_url", "is", null)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setFeaturedStory(data);
        }
      } catch (error) {
        console.error("Error loading featured story:", error);
      }
    }

    loadFeaturedStory();

    // Subscribe to realtime updates
    const donationsChannel = supabase
      .channel("donations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations" },
        () => loadStats()
      )
      .subscribe();

    const ordersChannel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadStats()
      )
      .subscribe();

    const storiesChannel = supabase
      .channel("stories-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "story_requests" },
        () => loadFeaturedStory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(donationsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(storiesChannel);
    };
  }, []);

  // ===== original staged reveal logic for Kenzie card =====
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 150);
    const t2 = setTimeout(() => setStep(2), 1850);
    const t3 = setTimeout(() => setStep(3), 3300);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, []);
  const paws = useMemo(() => Array.from({ length: 22 }, (_, i) => i), []);

  function onSelect(value: string) {
    if (!value) return;
    if (value === "school") nav("/select/school");
    else if (value === "nonprofit") nav("/select/nonprofit");
    else if (value === "personal") nav("/select/personal");
  }

  return (
    <div className="min-h-screen text-white">
      <MascotHeader />
      <ColorSelector />
      
      {/* Top bar (Menu | PPP | Find Causes) */}
      <header
        className="
          fixed top-0 inset-x-0 z-50
          px-4 md:px-6 py-3
          flex items-center justify-between
          text-white
          backdrop-blur bg-black/20
          border-b border-white/10
        "
      >
        {/* Left: Hamburger */}
        <button
          onClick={menu.on}
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-haspopup="dialog"
          aria-controls="menu"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Menu</span>
        </button>

        {/* Center: Brand */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <a
            href="/"
            className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
            aria-label="Print Power Purpose Home"
          >
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
        </div>

        {/* Right: Find Causes */}
        <button
          onClick={() => {
            const access = localStorage.getItem("ppp_access");
            if (!access) {
              localStorage.setItem("ppp_access", "guest");
            }
            nav("/select/nonprofit?flow=shopping");
          }}
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Find causes"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Find Causes</span>
        </button>
      </header>

      {/* Left-side section dots */}
      <ScrollDots sections={["hero", "solutions", "learn"]} />

      {/* Scroll container with 3 slides */}
      <div 
        className="scroll-smooth focus:outline-none"
        tabIndex={0}
        role="main"
        aria-label="Main content"
      >
        {/* ===== SLIDE 1: HERO + your Kenzie onboarding card ===== */}
        <section id="hero" className="relative h-full min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={14}
            overlay={<div className="absolute inset-0 bg-black/35" />}
          />

          <div className="px-6 text-center w-full">
            {/* Hero quote + CTA */}
            <div className="mx-auto w-full">
              <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow-md">
                E-commerce printing, centered around <em>your cause</em>
              </h1>
              <p className="mt-4 text-base md:text-lg opacity-90">
                One platform for professional print orders and optional donations—connecting
                communities and nonprofits in a single, seamless checkout.
              </p>
              <div className="mt-10">
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" x2="19" y1="8" y2="14"/>
                    <line x1="22" x2="16" y1="11" y2="11"/>
                  </svg>
                  Sign Up/Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SLIDE 2: SOLUTIONS (quote + band) ===== */}
        <section id="solutions" className="relative h-full min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={10}
            overlay={<div className="absolute inset-0 bg-black/35" />}
          />

          <div className="relative w-full h-full flex flex-col">
            {/* centered quote */}
            <div className="flex-1 w-full flex items-center justify-center px-6">
              <div className="text-center max-w-5xl mx-auto">
                <h2 className="font-serif text-[clamp(2.2rem,6vw,4.2rem)] leading-tight font-semibold drop-shadow">
                  Real impact requires real community
                </h2>
                <p className="mt-3 opacity-90 text-base md:text-lg">
                  Comprehensive print + donation tools designed to help nonprofits grow from a
                  360-degree perspective.
                </p>
                <div className="mt-8">
                  <button
                    onClick={() => {
                      localStorage.setItem("ppp_access", "guest");
                      nav("/welcome");
                    }}
                    className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90"
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            </div>

            {/* band: placeholder (L) + stats (R) */}
            <div className="w-full px-6 pb-10 mt-12">
              <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur p-6 md:p-8 flex flex-col h-full">
                  {featuredStory?.video_url ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="text-sm uppercase tracking-wide opacity-80 mb-3">Featured Story</div>
                      <div className="flex-1 rounded-lg overflow-hidden bg-black/30">
                        <video
                          className="w-full h-full object-contain"
                          src={featuredStory.video_url}
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="opacity-90">
                      <div className="text-sm uppercase tracking-wide opacity-80">Featured Story</div>
                      <h3 className="mt-2 text-2xl font-bold">Milestone Donor Stories</h3>
                      <p className="mt-2 opacity-90">
                        When donations reach $777 milestones, we feature the donor's story here. Help us reach the next milestone!
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur p-6 md:p-8 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-6 text-center w-full">
                    <Stat 
                      value={`$${(stats.totalRaised / 100).toLocaleString('en-US', { 
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0 
                      })}`} 
                      label="Raised for nonprofits" 
                    />
                    <Stat 
                      value={`${stats.organizationCount}+`} 
                      label="Partner organizations" 
                    />
                    <Stat value="99.95%" label="Platform uptime" />
                    <Stat 
                      value={`${stats.orderCount.toLocaleString()}+`} 
                      label="Orders fulfilled" 
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs opacity-70">
                Live stats updated in real-time from our database.
              </p>
            </div>
          </div>
        </section>

        {/* ===== SLIDE 3: LEARN (form + journey + links) ===== */}
        <section id="learn" className="relative h-full min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={8}
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />

          <div className="relative w-full h-full flex flex-col">
            <div className="flex-1 w-full flex items-center justify-center px-6">
              <div className="text-center max-w-4xl mx-auto text-white">
                <h2 className="font-serif text-[clamp(2.2rem,6vw,4.2rem)] leading-tight font-semibold drop-shadow">
                  Learn more about <span className="whitespace-nowrap">Print Power Purpose</span>
                </h2>
                <p className="mt-3 opacity-90 text-base md:text-lg">
                  Discover how our e-commerce printing + donations platform lets every order fund a cause—
                  all in one seamless checkout experience.
                </p>

                {/* lightweight local lead capture; replace with Supabase later */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      const fd = new FormData(e.currentTarget as HTMLFormElement);
                      const payload = {
                        first: fd.get("first") as string,
                        last: fd.get("last") as string,
                        email: fd.get("email") as string,
                        optin: !!fd.get("optin"),
                        ts: Date.now(),
                      };
                      localStorage.setItem("ppp:lead", JSON.stringify(payload));
                      alert("Thanks! We'll be in touch soon.");
                      (e.currentTarget as HTMLFormElement).reset();
                    } catch {}
                  }}
                  className="
                    mt-8 mx-auto w-full max-w-3xl
                    rounded-3xl border border-white/30 bg-white/10 backdrop-blur
                    shadow-2xl p-6 md:p-8 text-left
                  "
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="First Name" name="first" placeholder="Kenzie" />
                    <Field label="Last Name" name="last" placeholder="Supporter" />
                    <Field label="Email" name="email" type="email" placeholder="you@example.com" colSpan />
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm opacity-90">
                    <input type="checkbox" name="optin" className="size-4" />
                    <span>
                      Yes, send me PPP updates. I agree to the{" "}
                      <Link to="/policies/privacy" className="underline">Privacy Policy</Link> and{" "}
                      <Link to="/policies/terms" className="underline">Terms of Use</Link>.
                    </span>
                  </label>

                  <div className="mt-6 flex justify-center">
                    <button type="submit" className="rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90">
                      SUBMIT
                    </button>
                  </div>

                  <p className="mt-3 text-center text-xs opacity-70">
                    This site may be protected by reCAPTCHA; the Google Privacy Policy and Terms of Service apply.
                  </p>
                </form>
              </div>
            </div>

            <div className="w-full px-6">
              <div className="mx-auto max-w-3xl text-center text-white py-6">
                <div className="text-sm uppercase tracking-wide opacity-80">Continue Your Journey</div>
                <div className="mt-1 text-3xl font-serif">Speak to a Partner</div>
                <div className="mt-4">
                  <Link to="/contact" className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90">
                    CONTACT US
                  </Link>
                </div>
              </div>
            </div>

            <FooterStrip />
          </div>
        </section>
      </div>

      {/* Full-screen overlay menu */}
      <MenuOverlay
        open={menu.open}
        onClose={menu.off}
        items={[
          { label: "Solutions", href: "#solutions" },
          { label: "Learn", href: "#learn" },
          { label: "Products", href: "/products" },
          { label: "Causes", href: "/causes" },
          { label: "Contact", href: "/contact" },
          { label: "Donate", href: "/select/nonprofit?flow=donation" },
        ]}
      />
    </div>
  );
}

/* ---------- small helpers (keep file self-contained) ---------- */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/20 p-4">
      <div className="text-3xl md:text-4xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

function Field({
  label, name, placeholder, type = "text", colSpan,
}: { label: string; name: string; placeholder?: string; type?: string; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "md:col-span-2" : ""}>
      <label className="text-sm opacity-90">{label}</label>
      <input
        name={name}
        type={type}
        required
        className="mt-1 w-full rounded-xl bg-white/90 text-black px-3 py-2 outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}

function FooterStrip() {
  return (
    <div className="w-full px-6 pb-8">
      <div className="mx-auto max-w-6xl text-white/90 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <FooterCol title="About" links={[
          ["Our mission", "/about"], ["Team", "/team"], ["Press", "/press"],
        ]}/>
        <FooterCol title="Who We Serve" links={[
          ["Nonprofits & clubs", "/who-we-serve/nonprofits"], ["Schools & teams", "/who-we-serve/schools"],
        ]}/>
        <FooterCol title="Print Catalog" links={[
          ["All products", "/products"], ["Apparel", "/products/apparel"], ["Promo items", "/products/promo"],
        ]}/>
        <FooterCol title="Insights" links={[
          ["Blog", "/blog"], ["Fundraising guides", "/guides/fundraising"],
        ]}/>
        <FooterCol title="Support" links={[
          ["Help Center", "/help"], ["Privacy Policy", "/policies/privacy"], ["Terms of Use", "/policies/terms"],
        ]}/>
      </div>
      
      {/* Social Media Links */}
      <div className="mt-8 flex justify-center gap-6">
        <SocialLink href="https://www.tiktok.com/@printpowerpurpose" label="TikTok" icon="tiktok" />
        <SocialLink href="https://www.instagram.com/printpowerpurpose" label="Instagram" icon="instagram" />
        <SocialLink href="https://www.linkedin.com/company/printpowerpurpose" label="LinkedIn" icon="linkedin" />
        <SocialLink href="https://www.youtube.com/@printpowerpurpose" label="YouTube" icon="youtube" />
      </div>
      
      <p className="mt-6 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Print Power Purpose. Some figures shown are examples; replace with live data when available.
      </p>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-semibold">{title}</h4>
      <ul className="mt-2 space-y-1 text-sm">
        {links.map(([t, href]) => (
          <li key={href}>
            <Link to={href} className="hover:underline">
              {t}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const icons = {
    tiktok: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z",
    instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
    linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
  };
  
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 transition-all hover:scale-110"
      aria-label={label}
    >
      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d={icons[icon as keyof typeof icons]} />
      </svg>
    </a>
  );
}
