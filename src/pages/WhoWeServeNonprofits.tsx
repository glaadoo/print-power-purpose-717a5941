import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import MenuOverlay from "@/components/MenuOverlay";
import ScrollDots from "@/components/ScrollDots";
import useToggle from "@/hooks/useToggle";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PageContent {
  h1: string;
  subtitle: string;
  overview: string;
  who_we_serve: string[];
  benefits: Array<{ title: string; description: string }>;
  products: string[];
  use_cases: Array<{ title: string; description: string }>;
  selection_steps: string[];
}

export default function WhoWeServeNonprofits() {
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const menu = useToggle(false);

  useEffect(() => {
    document.title = "Who We Serve - Nonprofits - Print Power Purpose";
  }, []);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from("who_we_serve_pages")
          .select("content")
          .eq("page_slug", "nonprofits")
          .single();

        if (error) throw error;
        if (data) setContent(data.content as PageContent);
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/35" />}
        />
        <div className="relative text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="mt-4 text-white/80">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/35" />}
        />
        <GlassCard className="relative max-w-md">
          <p className="text-center text-white/80">Content not available</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Fixed Header */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <button
          onClick={menu.on}
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Open menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Menu</span>
        </button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <Link
            to="/"
            className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
            aria-label="Print Power Purpose Home"
          >
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </Link>
        </div>

        <Link
          to="/causes"
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Find causes"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Find Causes</span>
        </Link>
      </header>

      {/* Menu Overlay */}
      <MenuOverlay open={menu.open} onClose={menu.off} />

      {/* Section Dots */}
      <ScrollDots sections={["hero", "benefits", "products", "get-started"]} />

      {/* Sections */}
      <div className="scroll-smooth">
        {/* Hero Section */}
        <section id="hero" className="relative min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={14}
            overlay={<div className="absolute inset-0 bg-black/35" />}
          />
          
          <div className="relative px-6 w-full max-w-5xl mx-auto">
            <GlassCard padding="p-8 md:p-12">
              <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold text-white mb-6">
                {content.h1}
              </h1>
              <p className="text-xl text-white/90 mb-8">{content.subtitle}</p>
              
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
                <p className="text-white/80 leading-relaxed">{content.overview}</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Who We Serve</h2>
                <ul className="text-white/80 space-y-2 list-disc list-inside">
                  {content.who_we_serve.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="relative min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={12}
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />
          
          <div className="relative px-6 w-full max-w-5xl mx-auto">
            <GlassCard padding="p-8 md:p-12">
              <h2 className="font-serif text-[clamp(2rem,5vw,3.5rem)] font-semibold text-white mb-8">
                How Nonprofits Benefit
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {content.benefits.map((benefit, i) => (
                  <div key={i} className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-white/70">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Products & Use Cases Section */}
        <section id="products" className="relative min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={10}
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />
          
          <div className="relative px-6 w-full max-w-5xl mx-auto">
            <GlassCard padding="p-8 md:p-12">
              <div className="mb-12">
                <h2 className="font-serif text-[clamp(2rem,5vw,3.5rem)] font-semibold text-white mb-4">
                  Popular Products
                </h2>
                <p className="text-white/80 mb-6 leading-relaxed">
                  Support your outreach events and campaigns with professional printing:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {content.products.map((product, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-lg text-center border border-white/10">
                      <span className="text-white font-medium">{product}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-serif text-[clamp(2rem,5vw,3.5rem)] font-semibold text-white mb-6">
                  Common Use Cases
                </h2>
                <div className="space-y-6">
                  {content.use_cases.map((useCase, i) => (
                    <div key={i} className="bg-white/5 p-6 rounded-xl border border-white/10">
                      <h3 className="text-xl font-semibold text-white mb-2">{useCase.title}</h3>
                      <p className="text-white/70">{useCase.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Get Started Section */}
        <section id="get-started" className="relative min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={8}
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />
          
          <div className="relative px-6 w-full max-w-5xl mx-auto">
            <GlassCard padding="p-8 md:p-12">
              <h2 className="font-serif text-[clamp(2rem,5vw,3.5rem)] font-semibold text-white mb-6">
                How to Get Started
              </h2>
              <ol className="text-white/80 space-y-4 list-decimal list-inside mb-12">
                {content.selection_steps.map((step, i) => (
                  <li key={i} className="leading-relaxed text-lg">{step}</li>
                ))}
              </ol>

              <div className="pt-8 border-t border-white/20 text-center">
                <p className="text-white/70 mb-4">
                  Questions?{" "}
                  <Link to="/contact" className="text-white hover:underline font-medium">
                    Contact us
                  </Link>
                </p>
                <p className="text-xs text-white/60">
                  © {new Date().getFullYear()} Print Power Purpose
                </p>
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}
