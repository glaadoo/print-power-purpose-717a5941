import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import MenuOverlay from "@/components/MenuOverlay";
import HelpSearch from "@/components/HelpSearch";
import useToggle from "@/hooks/useToggle";

export default function HelpCenter() {
  const nav = useNavigate();
  const menu = useToggle(false);

  // Set document title
  useEffect(() => {
    document.title = "Help Center - Print Power Purpose";
  }, []);

  return (
    <div className="min-h-screen text-white">
      {/* Top bar - Brand only */}
      <header
        className="
          fixed top-0 inset-x-0 z-50
          h-14 px-4 md:px-6
          flex items-center justify-center
          text-white
          backdrop-blur bg-black/20
          border-b border-white/10
        "
      >
        {/* Center: Brand */}
        <a
          href="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      {/* Main scrollable content */}
      <div 
        className="pt-14 min-h-screen"
        role="main"
        aria-label="Help Center content"
      >
        {/* Hero Section - Now scrollable */}
        <section className="relative py-20 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={8}
            overlay={<div className="absolute inset-0 bg-black/40" />}
            className="fixed inset-0 -z-10"
          />

          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow-md mb-6">
              How can we help you today?
            </h1>
            <p className="text-base md:text-lg opacity-90 mb-8">
              Find answers, manage your orders, or chat with Kenzie.
            </p>

            {/* Search bar */}
            <div className="max-w-2xl mx-auto">
              <HelpSearch onOpenChat={() => {
                const event = new CustomEvent('open-kenzie-chat');
                window.dispatchEvent(event);
              }} />
            </div>
          </div>
        </section>
      </div>

      {/* Full-screen overlay menu */}
      <MenuOverlay
        open={menu.open}
        onClose={menu.off}
        items={[
          { label: "Home", href: "/" },
          { label: "Help Center", href: "/help" },
          { label: "Products", href: "/products" },
          { label: "Causes", href: "/causes" },
          { label: "Contact", href: "/contact" },
        ]}
      />
    </div>
  );
}
