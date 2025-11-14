import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowUp } from "lucide-react";

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
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white relative">
        <div className="fixed inset-0">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/70" />}
          />
        </div>
        <div className="relative text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="mt-4 text-white/80">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white relative">
        <div className="fixed inset-0">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/70" />}
          />
        </div>
        <GlassCard className="relative max-w-md">
          <p className="text-center text-white/80">Content not available</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <VideoBackground 
        srcMp4="/video/hero-background.mp4"
        parallaxVh={0}
      />
      <div className="fixed inset-0 bg-black/50 z-0" />

      <div className="relative z-10 min-h-screen max-w-5xl mx-auto">
        <div className="min-h-screen bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-y-auto px-6 md:px-10 pt-32 pb-32 relative">
          
          <article className="prose prose-invert max-w-none">
            <h1 className="text-5xl font-bold text-white mb-4">{content.h1}</h1>
            <p className="text-xl text-white/90 mb-12">{content.subtitle}</p>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Overview</h2>
              <p className="text-white/80">{content.overview}</p>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">Who We Serve</h2>
              <ul className="text-white/80 space-y-2">
                {content.who_we_serve.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">How Schools Benefit</h2>
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
              <h2 className="text-3xl font-bold text-white mb-4">Popular Products</h2>
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
              <h2 className="text-3xl font-bold text-white mb-4">Real-World Examples</h2>
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
              <h2 className="text-3xl font-bold text-white mb-4">How Supporters Select Your School</h2>
              <div className="bg-white/5 p-6 rounded-xl space-y-4">
                {content.selection_steps.map((step, i) => (
                  <p key={i} className="text-white/80">
                    <strong>Step {i + 1}:</strong> {step}
                  </p>
                ))}
              </div>
            </section>
          </article>

        </div>
      </div>
    </div>
  );
}
