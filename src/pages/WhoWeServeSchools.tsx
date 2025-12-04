import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import MenuOverlay from "@/components/MenuOverlay";
import { supabase } from "@/integrations/supabase/client";
import useToggle from "@/hooks/useToggle";
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

export default function WhoWeServeSchools() {
  const nav = useNavigate();
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const menu = useToggle(false);

  useEffect(() => {
    document.title = "Who We Serve - Schools | Print Power Purpose";
    
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from("who_we_serve_pages")
          .select("content")
          .eq("page_slug", "schools")
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
      <div className="min-h-screen text-white">
        <header className="fixed top-0 inset-x-0 z-50 h-14 px-4 md:px-6 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
          <button onClick={() => nav(-1)} className="text-sm hover:opacity-80 transition-opacity">
            ← Back
          </button>
          <a href="/" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
          <button onClick={menu.on} className="text-sm hover:opacity-80 transition-opacity">
            Menu
          </button>
        </header>
        <div className="pt-14 min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={8}
            overlay={<div className="absolute inset-0 bg-black/50" />}
            className="fixed inset-0 -z-10"
          />
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
            <p className="mt-4 text-white/80">Loading content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen text-white">
        <header className="fixed top-0 inset-x-0 z-50 h-14 px-4 md:px-6 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
          <button onClick={() => nav(-1)} className="text-sm hover:opacity-80 transition-opacity">
            ← Back
          </button>
          <a href="/" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
          <button onClick={menu.on} className="text-sm hover:opacity-80 transition-opacity">
            Menu
          </button>
        </header>
        <div className="pt-14 min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={8}
            overlay={<div className="absolute inset-0 bg-black/50" />}
            className="fixed inset-0 -z-10"
          />
          <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8 max-w-md">
            <p className="text-center text-muted-foreground">Content not available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 px-4 md:px-6 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <button onClick={() => nav(-1)} className="text-sm hover:opacity-80 transition-opacity">
          ← Back
        </button>
        <a href="/" className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
        <button onClick={menu.on} className="text-sm hover:opacity-80 transition-opacity">
          Menu
        </button>
      </header>

      {/* Main content */}
      <div className="pt-14 min-h-screen overflow-y-auto scroll-smooth">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          parallaxVh={8}
          overlay={<div className="absolute inset-0 bg-black/50" />}
          className="fixed inset-0 -z-10"
        />

        <section className="py-16 md:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-16">
              <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow-md mb-6">
                {content.h1}
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                {content.subtitle}
              </p>
            </div>

            {/* Overview */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Overview</h2>
              <p className="text-muted-foreground leading-relaxed">{content.overview}</p>
            </div>

            {/* Who We Serve */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Who We Serve</h2>
              <ul className="space-y-2">
                {content.who_we_serve.map((item, i) => (
                  <li key={i} className="text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits Grid */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-6 text-center">How Schools Benefit</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {content.benefits.map((benefit, i) => (
                  <div key={i} className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Products */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Popular Products</h2>
              <p className="text-muted-foreground mb-4">
                Support your school or team with professional printing:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {content.products.map((product, i) => (
                  <div key={i} className="bg-muted/50 px-4 py-3 rounded-lg text-center">
                    <span className="text-foreground text-sm font-medium">{product}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Use Cases */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-6 text-center">Real-World Examples</h2>
              <div className="space-y-4">
                {content.use_cases.map((useCase, i) => (
                  <div key={i} className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{useCase.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{useCase.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Selection Steps */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">How Supporters Select Your School</h2>
              <div className="space-y-4">
                {content.selection_steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-muted-foreground pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join schools and teams already benefiting from Print Power Purpose.
              </p>
              <button
                onClick={() => nav('/select/school')}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Find Your School
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Menu Overlay */}
      <MenuOverlay
        open={menu.open}
        onClose={menu.off}
        items={[
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
          { label: "Products", href: "/products" },
          { label: "Causes", href: "/causes" },
          { label: "Contact", href: "/contact" },
        ]}
      />
    </div>
  );
}
