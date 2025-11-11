import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import useToggle from "@/hooks/useToggle";
import MenuOverlay from "@/components/MenuOverlay";

export default function Press() {
  const nav = useNavigate();
  const menu = useToggle(false);

  useEffect(() => {
    document.title = "Press & Media - Print Power Purpose";
  }, []);

  const pressReleases = [
    {
      date: "March 2024",
      title: "Print Power Purpose Reaches $1 Million in Donations to Nonprofits",
      excerpt: "Platform celebrates milestone as custom printing service drives community fundraising nationwide.",
      link: "#"
    },
    {
      date: "January 2024",
      title: "New Partnership Program Launches for Schools and Teams",
      excerpt: "Expanded offerings make fundraising easier for educational institutions and sports organizations.",
      link: "#"
    },
    {
      date: "November 2023",
      title: "Print Power Purpose Wins Social Impact Award",
      excerpt: "Recognition for innovative approach to combining e-commerce with charitable giving.",
      link: "#"
    }
  ];

  const mediaKit = [
    { name: "Company Logo (PNG)", size: "2.4 MB" },
    { name: "Brand Guidelines (PDF)", size: "1.8 MB" },
    { name: "Press Kit (ZIP)", size: "5.2 MB" },
    { name: "Product Images (ZIP)", size: "12.4 MB" }
  ];

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
          <div className="max-w-4xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-16">
              <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow-md mb-6">
                Press & Media
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                News, announcements, and media resources from Print Power Purpose.
              </p>
            </div>

            {/* Press Contact */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8 mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Media Inquiries</h2>
              <p className="text-muted-foreground mb-4">
                For press inquiries, interviews, or media partnerships, please contact our media relations team:
              </p>
              <div className="space-y-2 text-foreground">
                <p><strong>Email:</strong> <a href="mailto:press@printpowerpurpose.com" className="text-primary hover:underline">press@printpowerpurpose.com</a></p>
                <p><strong>Phone:</strong> (555) 123-4567</p>
              </div>
            </div>

            {/* Recent Press Releases */}
            <div className="mb-12">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Recent Press Releases</h2>
              <div className="space-y-4">
                {pressReleases.map((release, idx) => (
                  <div key={idx} className="bg-background/95 backdrop-blur-md rounded-xl border border-border/20 shadow-lg p-6">
                    <p className="text-sm text-primary font-medium mb-2">{release.date}</p>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{release.title}</h3>
                    <p className="text-muted-foreground mb-4">{release.excerpt}</p>
                    <a href={release.link} className="text-primary hover:underline text-sm font-medium">
                      Read More →
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Media Kit */}
            <div className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Media Kit</h2>
              <p className="text-muted-foreground mb-6">
                Download our brand assets, logos, and product images for media use.
              </p>
              <div className="space-y-3">
                {mediaKit.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg border border-border/10">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.size}</p>
                    </div>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Company Facts */}
            <div className="mt-12 bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Quick Facts</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Founded</h3>
                  <p className="text-muted-foreground">2022</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Headquarters</h3>
                  <p className="text-muted-foreground">Austin, TX</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Total Donated</h3>
                  <p className="text-muted-foreground">$1,000,000+</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Nonprofit Partners</h3>
                  <p className="text-muted-foreground">150+</p>
                </div>
              </div>
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
