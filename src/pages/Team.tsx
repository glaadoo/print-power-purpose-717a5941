import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import useToggle from "@/hooks/useToggle";
import MenuOverlay from "@/components/MenuOverlay";

const teamMembers = [
  {
    name: "Wayne Strobel",
    title: "Founder / CEO",
    image: "/images/team/wayne.png"
  },
  {
    name: "Hamza Sakar",
    title: "Project Manager",
    image: "/images/team/hamza.png"
  },
  {
    name: "Shikha Dodecha",
    title: "Technical Lead",
    image: "/images/team/shikha.png"
  },
  {
    name: "Kwasi Adofo",
    title: "Frontend UI/UX Engineer",
    image: "/images/team/kwasi.png"
  },
  {
    name: "Ralph Desir",
    title: "Quality Lead",
    image: "/images/team/ralph.png"
  },
  {
    name: "Derrick Yeboah",
    title: "Backend & Infrastructure Engineer",
    image: "/images/team/derrick.png"
  }
];

export default function Team() {
  const nav = useNavigate();
  const menu = useToggle(false);

  useEffect(() => {
    document.title = "Our Team - Print Power Purpose";
  }, []);

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
                Meet Our Team
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                The people powering purpose through print.
              </p>
            </div>

            {/* Team Grid - 1 col mobile, 2 tablet, 3 desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {teamMembers.map((member, idx) => (
                <div 
                  key={idx} 
                  className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6 flex flex-col items-center text-center"
                >
                  {/* Image placeholder */}
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-muted/50 border-2 border-primary/20 overflow-hidden mb-4 flex items-center justify-center">
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = `<span class="text-3xl font-bold text-primary/60">${member.name.split(' ').map(n => n[0]).join('')}</span>`;
                      }}
                    />
                  </div>
                  
                  {/* Name */}
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                    {member.name}
                  </h3>
                  
                  {/* Title */}
                  <p className="text-sm text-muted-foreground">
                    {member.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Join Us CTA */}
            <div className="mt-16 bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Join Our Mission
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                We're always looking for talented individuals who share our passion for social impact.
              </p>
              <button
                onClick={() => nav('/contact')}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Get In Touch
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
