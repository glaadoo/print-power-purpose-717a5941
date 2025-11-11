import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import useToggle from "@/hooks/useToggle";
import MenuOverlay from "@/components/MenuOverlay";

export default function Team() {
  const nav = useNavigate();
  const menu = useToggle(false);

  useEffect(() => {
    document.title = "Our Team - Print Power Purpose";
  }, []);

  const teamMembers = [
    {
      name: "Sarah Johnson",
      role: "Founder & CEO",
      bio: "Sarah founded Print Power Purpose with a vision to transform custom printing into a force for social good. With 15 years of experience in social entrepreneurship, she leads our mission to empower nonprofits and schools.",
      image: "/placeholder.svg"
    },
    {
      name: "Michael Chen",
      role: "Head of Operations",
      bio: "Michael ensures every order is produced with quality and delivered on time. His background in supply chain management helps us maintain efficiency while keeping costs low for our partners.",
      image: "/placeholder.svg"
    },
    {
      name: "Emily Rodriguez",
      role: "Director of Partnerships",
      bio: "Emily builds relationships with nonprofits and schools across the country. Her passion for education and community development drives our cause selection and impact measurement.",
      image: "/placeholder.svg"
    },
    {
      name: "David Park",
      role: "Creative Director",
      bio: "David leads our design team to help organizations create compelling custom products. His expertise in branding ensures every item tells a powerful story.",
      image: "/placeholder.svg"
    }
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
                Meet Our Team
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                We're a passionate group dedicated to helping organizations raise funds and make an impact through custom products.
              </p>
            </div>

            {/* Team Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">{member.name}</h3>
                      <p className="text-sm text-primary font-medium">{member.role}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{member.bio}</p>
                </div>
              ))}
            </div>

            {/* Join Us CTA */}
            <div className="mt-16 bg-background/95 backdrop-blur-md rounded-2xl border border-border/20 shadow-xl p-8 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Join Our Mission
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                We're always looking for talented individuals who share our passion for social impact. If you're interested in joining our team, we'd love to hear from you.
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
