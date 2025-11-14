import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
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
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const menu = useToggle(false);

  useEffect(() => {
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
      <div className="min-h-screen flex items-center justify-center text-white relative">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          parallaxVh={14}
          overlay={<div className="absolute inset-0 bg-black/35" />}
        />
        <div className="relative text-center z-10">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="mt-4 text-white/80">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white relative">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          parallaxVh={14}
          overlay={<div className="absolute inset-0 bg-black/35" />}
        />
        <GlassCard className="relative max-w-md z-10">
          <p className="text-center text-white/80">Content not available</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <MenuOverlay open={menu.open} onClose={menu.off} />

      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-black/20 backdrop-blur">
        <Link to="/" className="flex items-center gap-2">
          <img src="/IMG_4805.jpeg" alt="Logo" className="h-10 w-10 rounded-full" />
          <span className="font-bold text-lg hidden sm:inline">Print Power Purpose</span>
        </Link>

        <button
          onClick={menu.toggle}
          className="flex flex-col gap-1.5 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Toggle menu"
        >
          <span className="w-5 h-0.5 bg-white" />
          <span className="w-5 h-0.5 bg-white" />
          <span className="w-5 h-0.5 bg-white" />
        </button>
      </header>

      {/* Single scrollable section */}
      <section className="relative h-screen flex items-center justify-center">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          parallaxVh={14}
          overlay={<div className="absolute inset-0 bg-black/35" />}
        />

        <div className="relative z-10 w-full h-full px-6 py-24 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <GlassCard className="p-8 md:p-12">
              <article className="prose prose-invert max-w-none">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{content.h1}</h1>
                <p className="text-lg md:text-xl text-white/90 mb-12">{content.subtitle}</p>

                <section className="mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Overview</h2>
                  <p className="text-white/80">{content.overview}</p>
                </section>

                <section className="mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Who We Serve</h2>
                  <ul className="text-white/80 space-y-2">
                    {content.who_we_serve.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">How Schools Benefit</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {content.benefits.map((benefit, i) => (
                      <div key={i} className="bg-white/5 p-6 rounded-xl">
                        <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                        <p className="text-white/70">{benefit.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Popular Products</h2>
                  <p className="text-white/80 mb-4">
                    Support your school or team with professional printing:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {content.products.map((product, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-lg text-center">
                        <span className="text-white font-medium">{product}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Real-World Examples</h2>
                  <div className="space-y-6">
                    {content.use_cases.map((useCase, i) => (
                      <div key={i} className="bg-white/5 p-6 rounded-xl">
                        <h3 className="text-xl font-semibold text-white mb-2">{useCase.title}</h3>
                        <p className="text-white/70">{useCase.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">How Supporters Select Your School</h2>
                  <div className="bg-white/5 p-6 rounded-xl space-y-4">
                    {content.selection_steps.map((step, i) => (
                      <p key={i} className="text-white/80">
                        <strong>Step {i + 1}:</strong> {step}
                      </p>
                    ))}
                  </div>
                </section>
              </article>
            </GlassCard>
          </div>
        </div>
      </section>
    </div>
  );
}
