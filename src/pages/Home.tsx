import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import GlassCard from "../components/GlassCard";
import VideoBackground from "@/components/VideoBackground";
import MenuOverlay from "@/components/MenuOverlay";
import ScrollDots from "@/components/ScrollDots";
import useToggle from "@/hooks/useToggle";

export default function Home() {
  const nav = useNavigate();
  const menu = useToggle(false);

  // Set document title
  useEffect(() => {
    document.title = "Home - Print Power Purpose";
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
    <div className="fixed inset-0 text-white">
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
        <a
          href="/causes"
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Find causes"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Find Causes</span>
        </a>
      </header>

      {/* Left-side section dots */}
      <ScrollDots sections={["hero", "solutions", "learn"]} />

      {/* Snap container with 3 slides */}
      <div className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth">
        {/* ===== SLIDE 1: HERO + your Kenzie onboarding card ===== */}
        <section id="hero" className="relative h-full min-h-screen snap-start flex items-center justify-center">
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
              <div className="mt-8 flex justify-center">
                <a
                  href="#solutions"
                  className="rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90 border border-white/10"
                >
                  Discover Our Services
                </a>
              </div>
            </div>

            {/* Your original GlassCard onboarding (floats under the quote) */}
            <div className="mt-8 flex justify-center px-4">
              <div className="w-full max-w-[1200px]">
                <GlassCard>
                  {/* paws banner */}
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

                  <div className="text-center text-black">
                    {step >= 1 && (
                      <h2 className="typewriter-nocaret heading-fancy text-2xl sm:text-4xl">
                        Welcome to Print with Purpose
                      </h2>
                    )}
                    <div className="h-2" />
                    {step >= 2 && (
                      <div
                        className="typewriter-nocaret mx-auto text-xl sm:text-3xl"
                        style={{ fontFamily: "'Pacifico', cursive" }}
                      >
                        I am your mascot Kenzie
                      </div>
                    )}
                    {step >= 3 && (
                      <div className="mt-6">
                        <p className="text-gray-800 mb-2">What are we printing for today?</p>
                        <select
                          defaultValue=""
                          onChange={(e) => onSelect(e.target.value)}
                          className="w-full sm:w-96 rounded-md border border-white/40 bg-white/20 backdrop-blur px-3 py-2 focus:ring-2"
                          aria-label="Select purpose"
                        >
                          <option value="" disabled className="text-black">Select an option</option>
                          <option value="school" className="text-black">School</option>
                          <option value="nonprofit" className="text-black">Nonprofit</option>
                          <option value="personal" className="text-black">Personal mission</option>
                        </select>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SLIDE 2: SOLUTIONS (quote + band) ===== */}
        <section id="solutions" className="relative h-full min-h-screen snap-start flex items-center justify-center">
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
                  <a
                    href="/products"
                    className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90"
                  >
                    Explore Our Solutions
                  </a>
                </div>
              </div>
            </div>

            {/* band: placeholder (L) + stats (R) */}
            <div className="w-full px-6 pb-10">
              <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur p-6 md:p-8">
                  <div className="opacity-90">
                    <div className="text-sm uppercase tracking-wide opacity-80">Placeholder</div>
                    <h3 className="mt-2 text-2xl font-bold">Featured Nonprofit</h3>
                    <p className="mt-2 opacity-90">
                      Reserve this space for a rotating spotlight (logo, short story, donate link).
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur p-6 md:p-8 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-6 text-center w-full">
                    <Stat value="$197M+" label="Raised for nonprofits*" />
                    <Stat value="260+" label="Partner organizations" />
                    <Stat value="99.95%" label="Platform uptime" />
                    <Stat value="50k+" label="Orders fulfilled" />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs opacity-70">
                *Example figures shown as placeholders. Replace with live stats when ready.
              </p>
            </div>
          </div>
        </section>

        {/* ===== SLIDE 3: LEARN (form + journey + links) ===== */}
        <section id="learn" className="relative h-full min-h-screen snap-start flex items-center justify-center">
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
                      <a href="/privacy" className="underline">Privacy Policy</a> and{" "}
                      <a href="/terms" className="underline">Terms of Use</a>.
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
                <h3 className="mt-1 text-3xl font-serif">Speak to a Partner</h3>
                <div className="mt-4">
                  <a href="/contact" className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90">
                    CONTACT US
                  </a>
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
          { label: "Home", href: "#hero" },
          { label: "Solutions", href: "#solutions" },
          { label: "Learn", href: "#learn" },
          { label: "Products", href: "/products" },
          { label: "Causes", href: "/causes" },
          { label: "Contact", href: "/contact" },
          { label: "Donate", href: "/donate" },
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
          ["Nonprofits & clubs", "/causes"], ["Schools & teams", "/schools"],
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
          <li key={href}><a href={href} className="hover:underline">{t}</a></li>
        ))}
      </ul>
    </div>
  );
}
