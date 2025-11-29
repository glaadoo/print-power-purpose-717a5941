import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import VistaprintNav from "../components/VistaprintNav";
import RecentlyViewed from "@/components/RecentlyViewed";
import FeaturedProducts from "@/components/FeaturedProducts";
import MenuOverlay from "@/components/MenuOverlay";
import useToggle from "@/hooks/useToggle";
import { supabase } from "@/integrations/supabase/client";
import kenzieMascot from "@/assets/kenzie-mascot.png";
import Footer from "@/components/Footer";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import KenzieJourneySection from "@/components/KenzieJourneySection";

export default function Home() {
  console.log('[Home] Component rendering');
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const menu = useToggle(false);
  console.log('[Home] State initialized');

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Real stats from database
  const [stats, setStats] = useState({
    totalRaised: 0,
    organizationCount: 0,
    orderCount: 0,
  });

  // Featured videos state with metadata from database
  const [featuredVideos, setFeaturedVideos] = useState<Array<{ 
    name: string; 
    url: string; 
    title: string | null;
    description: string | null;
    thumbnail_url: string | null;
  }>>([]);

  // Set document title and check auth state
  useEffect(() => {
    document.title = "Home - Print Power Purpose";
    
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
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

    // Load featured videos with metadata from database
    async function loadFeaturedVideos() {
      try {
        // Get video metadata from database
        const { data: metadata, error: metadataError } = await supabase
          .from('video_metadata')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (metadataError) throw metadataError;

        // Get videos from storage and merge with metadata
        const { data: storageFiles, error: storageError } = await supabase.storage
          .from('videos')
          .list();
        
        if (storageError) throw storageError;
        
        if (storageFiles && storageFiles.length > 0) {
          const videosWithMetadata = storageFiles
            .map(file => {
              const meta = metadata?.find(m => m.video_name === file.name);
              return {
                name: file.name,
                url: supabase.storage.from('videos').getPublicUrl(file.name).data.publicUrl,
                title: meta?.title || file.name.replace(/\.[^/.]+$/, ""),
                description: meta?.description || null,
                thumbnail_url: meta?.thumbnail_url 
                  ? supabase.storage.from('video-thumbnails').getPublicUrl(meta.thumbnail_url).data.publicUrl
                  : null
              };
            })
            .sort((a, b) => {
              const aOrder = metadata?.find(m => m.video_name === a.name)?.display_order || 999;
              const bOrder = metadata?.find(m => m.video_name === b.name)?.display_order || 999;
              return aOrder - bOrder;
            });
          
          setFeaturedVideos(videosWithMetadata);
        }
      } catch (error) {
        console.error("Error loading featured videos:", error);
      }
    }

    loadFeaturedVideos();

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

    return () => {
      supabase.removeChannel(donationsChannel);
      supabase.removeChannel(ordersChannel);
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
    <div className="min-h-screen bg-white">
      <VistaprintNav />

      {/* Dashboard Header */}
      <section className="bg-gradient-to-br from-blue-50 to-white border-b border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <img
                src={kenzieMascot}
                alt="Kenzie - Print Power Purpose Mascot"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-lg"
              />
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                  Welcome to Print Power Purpose
                </h1>
                <p className="text-base text-gray-600">
                  Professional printing that supports your favorite causes
                </p>
              </div>
            </div>
            {!isAuthenticated && (
              <div className="flex gap-3">
                <button
                  onClick={() => nav("/auth")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-sm"
                >
                  Sign Up / Sign In
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("ppp_access", "guest");
                    nav("/welcome");
                  }}
                  className="bg-white hover:bg-gray-50 text-gray-900 font-semibold px-6 py-3 rounded-lg border-2 border-gray-300 transition-colors"
                >
                  Continue as Guest
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Kenzie Journey Section - Only show for authenticated users */}
      {isAuthenticated && <KenzieJourneySection />}

      {/* Featured Products Section */}
      <FeaturedProducts />

      {/* Milestone Dashboard and Donor Stories - Two Column Layout */}
      <section className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Impact Metrics Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Our Impact
              </h2>
              <p className="text-gray-600 mb-8">
                Real impact requires real community. Comprehensive print + donation tools designed to help nonprofits grow.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    ${(stats.totalRaised / 100).toLocaleString('en-US', { 
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0 
                    })}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Raised for nonprofits</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{stats.organizationCount}+</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Partner organizations</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">99.95%</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Platform uptime</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{stats.orderCount.toLocaleString()}+</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Orders fulfilled</div>
                </div>
              </div>
            </div>

            {/* Donor Stories Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Milestone Donor Stories</h2>
              {featuredVideos.length > 0 ? (
                <div className="relative">
                  <Carousel
                    opts={{
                      align: "start",
                      loop: true,
                    }}
                    plugins={[
                      Autoplay({
                        delay: 8000,
                        stopOnInteraction: true,
                      }),
                    ]}
                    className="w-full"
                  >
                    <CarouselContent>
                      {featuredVideos.map((video, index) => (
                        <CarouselItem key={index} className="md:basis-1/1 lg:basis-1/1">
                          <div className="rounded-lg overflow-hidden shadow-lg bg-gray-900 aspect-video relative group">
                            {video.thumbnail_url && (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title || "Video thumbnail"}
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                              />
                            )}
                            <video
                              className="w-full h-full object-contain"
                              src={video.url}
                              controls
                              muted
                              playsInline
                              poster={video.thumbnail_url || undefined}
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="bg-white hover:bg-gray-100 border-gray-300 -left-4" />
                    <CarouselNext className="bg-white hover:bg-gray-100 border-gray-300 -right-4" />
                  </Carousel>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center aspect-video bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                  <p className="text-gray-600 text-center mb-2">
                    No donor stories yet
                  </p>
                  <p className="text-sm text-gray-500 text-center">
                    Upload videos in the admin panel to showcase donor stories
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recently Viewed - Only show for authenticated users */}
      {isAuthenticated && (
        <section className="bg-gray-50 py-16 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RecentlyViewed />
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />

      {/* Menu Overlay */}
      {menu.open && (
        <MenuOverlay
          open={menu.open}
          onClose={menu.off}
          items={[
            { label: "Products", href: "/products" },
            { label: "Causes", href: "/causes" },
            { label: "Contact", href: "/contact" },
            { label: "Donate", href: "/select/nonprofit?flow=donation" },
          ]}
        />
      )}
    </div>
  );
}

/* ---------- small helpers (keep file self-contained) ---------- */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold section-title mb-2">{value}</div>
      <div className="text-sm text-gray-600 uppercase tracking-wide">{label}</div>
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
    <footer className="w-full px-6 pb-8 text-white">
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 text-white">
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
      <div className="mt-8 flex justify-center gap-6 text-white">
        <SocialLink href="https://www.tiktok.com/@printpowerpurpose" label="TikTok" icon="tiktok" />
        <SocialLink href="https://www.instagram.com/printpowerpurpose" label="Instagram" icon="instagram" />
        <SocialLink href="https://www.linkedin.com/company/printpowerpurpose" label="LinkedIn" icon="linkedin" />
        <SocialLink href="https://www.youtube.com/@printpowerpurpose" label="YouTube" icon="youtube" />
      </div>
      
      <p className="mt-6 text-center text-xs text-white font-normal">
        © {new Date().getFullYear()} Print Power Purpose. Some figures shown are examples; replace with live data when available.
      </p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="text-white">
      <h4 className="font-semibold text-white mb-2 pb-1 border-b-2 border-blue-600">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-white">
        {links.map(([t, href]) => (
          <li key={href}>
            <Link to={href} className="text-white hover:text-blue-300 transition-colors">
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
