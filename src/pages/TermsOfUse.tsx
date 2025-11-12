import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { exportToPDF } from "@/lib/pdf-export";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import DOMPurify from "dompurify";

interface LegalDoc {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  effective_date: string;
  published_at: string | null;
  status: string;
  changelog: string | null;
}

export default function TermsOfUse() {
  const [searchParams] = useSearchParams();
  const requestedVersion = searchParams.get("version");
  
  const [document, setDocument] = useState<LegalDoc | null>(null);
  const [versions, setVersions] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    fetchDocument();
    fetchVersions();
  }, [requestedVersion]);

  const fetchDocument = async () => {
    try {
      let query = supabase
        .from("legal_documents")
        .select("*")
        .eq("type", "terms");

      if (requestedVersion) {
        query = query.eq("version", parseInt(requestedVersion));
      } else {
        query = query.eq("status", "published");
      }

      const { data, error } = await query
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDocument(data);
    } catch (error: any) {
      toast.error("Failed to load terms of use");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("id, version, effective_date, published_at, changelog, type, title, content, status")
        .eq("type", "terms")
        .eq("status", "published")
        .order("version", { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      console.error("Failed to fetch versions:", error);
    }
  };

  const handleExport = async () => {
    if (!document) return;
    const result = await exportToPDF(document);
    if (result.success) {
      toast.success("PDF downloaded successfully");
    } else {
      toast.error("Failed to export PDF");
    }
  };

  const [showBackToTop, setShowBackToTop] = useState(false);

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
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/70" />}
        />
        <div className="relative text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white/80">Loading terms of use...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white relative">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/70" />}
        />
        <GlassCard className="relative max-w-md">
          <p className="text-center text-white/80">
            Terms of use not available
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Fixed video background */}
      <div className="fixed inset-0">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/70" />}
        />
      </div>

      {/* Top Navigation */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Home</span>
        </Link>

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
          to="/legal"
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Legal Overview"
        >
          <span className="hidden sm:inline">Legal</span>
        </Link>
      </header>

      {/* Scrollable content */}
      <div className="relative min-h-screen pt-24 pb-20 px-6 md:px-16 py-10 md:py-20">
        <div className="mx-auto max-w-5xl">
          <GlassCard padding="p-6 md:p-10">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-serif font-semibold text-white mb-3">
                {document.title}
              </h1>
              <p className="text-white/70 mt-2 uppercase tracking-wide text-xs">
                Version v{document.version}.0.0 · Effective {new Date(document.effective_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {document.published_at && ` · Last updated ${new Date(document.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              </p>

              {/* PDF Download Button */}
              <div className="mt-6">
                <Button 
                  onClick={handleExport} 
                  variant="outline" 
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  aria-label="Download PDF"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              {/* Version History */}
              {versions.length > 1 && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <button
                    onClick={() => setShowVersions(!showVersions)}
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
                    aria-expanded={showVersions}
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        showVersions ? "rotate-180" : ""
                      }`}
                    />
                    View previous versions ({versions.length - 1} available)
                  </button>
                  
                  {showVersions && (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-lg font-semibold text-white mb-3">Version History</h3>
                      {versions.map((v) => (
                        <Link
                          key={v.id}
                          to={`/policies/terms?version=${v.version}`}
                          className="block p-4 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">Version {v.version}</span>
                              {v.version === document.version && (
                                <Badge variant="default" className="bg-white/20 text-white border-none">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-white/60">
                              {new Date(v.effective_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          {v.changelog && (
                            <p className="text-sm text-white/70">
                              {v.changelog}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <article className="prose prose-invert max-w-none mt-8">
              <div 
                className="leading-relaxed text-white/90 [&_p]:mb-6 [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:mt-6 [&_h3]:mb-3 [&_h4]:mt-4 [&_h4]:mb-2 [&_ul]:mb-6 [&_ul]:space-y-3 [&_ol]:mb-6 [&_ol]:space-y-3 [&_li]:mb-2"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(document.content) }}
              />
            </article>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-white/20 text-center text-sm text-white/60">
              <p className="mb-2">
                Questions about our terms?{" "}
                <Link to="/contact" className="text-white hover:underline">
                  Contact us
                </Link>
              </p>
              <p className="text-xs">
                © {new Date().getFullYear()} Print Power Purpose
              </p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-all shadow-lg"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
