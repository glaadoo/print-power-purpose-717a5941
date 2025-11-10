import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import VideoBackground from "@/components/VideoBackground";
import MenuOverlay from "@/components/MenuOverlay";
import ScrollDots from "@/components/ScrollDots";
import HelpSearch from "@/components/HelpSearch";
import useToggle from "@/hooks/useToggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HelpCenter() {
  const nav = useNavigate();
  const menu = useToggle(false);

  // Set document title
  useEffect(() => {
    document.title = "Help Center - Print Power Purpose";
  }, []);

  // Generate 100 random paws with different positions, sizes, and delays
  const backgroundPaws = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 90 + 5}%`,
      left: `${Math.random() * 90 + 5}%`,
      size: Math.random() * 3 + 2, // 2rem to 5rem
      opacity: Math.random() * 0.4 + 0.3, // 0.3 to 0.7
      delay: Math.random() * 5, // 0s to 5s
    }));
  }, []);

  return (
    <div className="min-h-screen text-white">
      {/* Top bar - Brand only */}
      <header
        className="
          fixed top-0 inset-x-0 z-50
          px-4 md:px-6 py-3
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

      {/* Left-side section dots */}
      <ScrollDots sections={["hero", "categories", "faq", "contact"]} />

      {/* Scroll container */}
      <div 
        className="scroll-smooth focus:outline-none"
        tabIndex={0}
        role="main"
        aria-label="Help Center content"
      >
        {/* ===== SECTION 1: HERO ===== */}
        <section id="hero" className="relative h-full min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={14}
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />

          {/* Programmatically generated floating paws */}
          {backgroundPaws.slice(0, 25).map((paw) => (
            <div
              key={`hero-paw-${paw.id}`}
              className="absolute animate-float pointer-events-none"
              style={{
                top: paw.top,
                left: paw.left,
                opacity: paw.opacity,
                animationDelay: `${paw.delay}s`,
                fontSize: `${paw.size}rem`,
              }}
            >
              🐾
            </div>
          ))}

          <div className="px-6 text-center w-full max-w-4xl mx-auto">
            <h1 className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] leading-tight font-semibold drop-shadow-md">
              How can we help you today?
            </h1>
            <p className="mt-4 text-base md:text-lg opacity-90">
              Find answers, manage your orders, or chat with Kenzie.
            </p>

            {/* Search bar */}
            <div className="mt-8 mx-auto max-w-2xl">
              <HelpSearch onOpenChat={() => {
                const event = new CustomEvent('open-kenzie-chat');
                window.dispatchEvent(event);
              }} />
            </div>
          </div>
        </section>

        {/* ===== SECTION 2: HELP CATEGORIES ===== */}
        <section id="categories" className="relative h-full min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={10}
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />

          {/* Programmatically generated floating paws */}
          {backgroundPaws.slice(25, 50).map((paw) => (
            <div
              key={`categories-paw-${paw.id}`}
              className="absolute animate-float pointer-events-none"
              style={{
                top: paw.top,
                left: paw.left,
                opacity: paw.opacity,
                animationDelay: `${paw.delay}s`,
                fontSize: `${paw.size}rem`,
              }}
            >
              🐾
            </div>
          ))}

          <div className="px-6 w-full max-w-6xl mx-auto">
            <h2 className="text-center font-serif text-[clamp(2rem,5vw,3.5rem)] leading-tight font-semibold drop-shadow mb-12">
              What do you need help with?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Orders & Payments */}
              <GlassCard 
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-2xl"
                padding="p-8"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4">📦</div>
                  <h3 className="text-2xl font-bold mb-3">Orders & Payments</h3>
                  <p className="opacity-90 text-sm">
                    Learn how to track your order, request changes, or get help with Stripe payments.
                  </p>
                </div>
              </GlassCard>

              {/* Card 2: Products & Causes */}
              <GlassCard 
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-2xl"
                padding="p-8"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4">🎨</div>
                  <h3 className="text-2xl font-bold mb-3">Products & Causes</h3>
                  <p className="opacity-90 text-sm">
                    Find info on print items, nonprofit causes, and donation progress.
                  </p>
                </div>
              </GlassCard>

              {/* Card 3: Chat & Contact */}
              <GlassCard 
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-2xl"
                padding="p-8"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4">💬</div>
                  <h3 className="text-2xl font-bold mb-3">Chat & Contact</h3>
                  <p className="opacity-90 text-sm">
                    Reach our team or chat with Kenzie directly for help.
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* ===== SECTION 3: FAQ ACCORDION ===== */}
        <section id="faq" className="relative h-full min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={8}
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />

          {/* Programmatically generated floating paws */}
          {backgroundPaws.slice(50, 75).map((paw) => (
            <div
              key={`faq-paw-${paw.id}`}
              className="absolute animate-float pointer-events-none"
              style={{
                top: paw.top,
                left: paw.left,
                opacity: paw.opacity,
                animationDelay: `${paw.delay}s`,
                fontSize: `${paw.size}rem`,
              }}
            >
              🐾
            </div>
          ))}

          <div className="px-6 w-full max-w-4xl mx-auto">
            <h2 className="text-center font-serif text-[clamp(2rem,5vw,3.5rem)] leading-tight font-semibold drop-shadow mb-8">
              Frequently Asked Questions
            </h2>

            <GlassCard padding="p-8">
              <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem value="item-1" className="border-b border-white/20">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline text-white">
                    How do I check my order status?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/90 text-base pt-2">
                    You can check your order status by clicking "Check order status" in the Kenzie chatbot 
                    (bottom-right corner). Simply enter your order ID or email address, and Kenzie will 
                    fetch your order details in real-time. You can also view your order history in your 
                    account dashboard.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-b border-white/20">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline text-white">
                    How can I donate to a specific cause?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/90 text-base pt-2">
                    Visit our Causes page to browse all available nonprofit organizations, schools, and 
                    personal causes. Click on any cause to learn more and make a donation. You can also 
                    add an optional donation during checkout when purchasing products. Every donation 
                    goes directly to your selected cause.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-b border-white/20">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline text-white">
                    Why hasn't my donation shown up yet?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/90 text-base pt-2">
                    Donations are processed immediately through Stripe and should appear in our system 
                    within a few minutes. If you don't see your donation reflected after 15 minutes, 
                    please check your email for a payment confirmation. If you still have concerns, 
                    contact us at support@printpowerpurpose.com with your order ID.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-b border-white/20">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline text-white">
                    Can I get a receipt for my donation?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/90 text-base pt-2">
                    Yes! You'll receive an email receipt immediately after your donation is processed. 
                    The receipt includes your donation amount, the cause you supported, and your 
                    transaction ID. You can also request a duplicate receipt by contacting our support 
                    team or asking Kenzie in the chat.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-b-0">
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline text-white">
                    How can I contact support?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/90 text-base pt-2">
                    We're here to help! You can reach us in three ways: (1) Chat with Kenzie, our AI 
                    assistant, for instant answers (bottom-right corner), (2) Email us at 
                    support@printpowerpurpose.com, or (3) Visit our Contact page to send us a message 
                    through our contact form. We typically respond within 24 hours.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </GlassCard>
          </div>
        </section>

        {/* ===== SECTION 4: CONTACT & CHAT ===== */}
        <section id="contact" className="relative h-full min-h-screen flex items-center justify-center">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            parallaxVh={6}
            overlay={<div className="absolute inset-0 bg-black/40" />}
          />

          {/* Programmatically generated floating paws */}
          {backgroundPaws.slice(75, 100).map((paw) => (
            <div
              key={`contact-paw-${paw.id}`}
              className="absolute animate-float pointer-events-none"
              style={{
                top: paw.top,
                left: paw.left,
                opacity: paw.opacity,
                animationDelay: `${paw.delay}s`,
                fontSize: `${paw.size}rem`,
              }}
            >
              🐾
            </div>
          ))}

          <div className="px-6 w-full max-w-4xl mx-auto text-center">
            <GlassCard padding="p-12">
              <div className="text-5xl mb-6">🐾</div>
              <h2 className="font-serif text-[clamp(2rem,5vw,3.5rem)] leading-tight font-semibold mb-4">
                Need more help?
              </h2>
              <p className="text-lg opacity-90 mb-8">
                We're here for you. Chat with Kenzie or reach out to our support team directly.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => {
                    // Trigger Kenzie chat - the chatbot is already on the page
                    const chatButton = document.querySelector('[aria-label*="Kenzie"]') as HTMLButtonElement;
                    if (chatButton) chatButton.click();
                  }}
                  className="
                    rounded-full px-8 py-4 
                    bg-white text-black font-semibold 
                    hover:bg-white/90 hover:scale-105 
                    transition-all duration-200
                    shadow-lg
                  "
                >
                  Chat with Kenzie 🐾
                </button>

                <a
                  href="mailto:support@printpowerpurpose.com"
                  className="
                    rounded-full px-8 py-4 
                    bg-white/10 backdrop-blur border border-white/30 
                    text-white font-semibold 
                    hover:bg-white/20 hover:scale-105 
                    transition-all duration-200
                  "
                >
                  Email Support
                </a>
              </div>

              <p className="mt-8 text-sm opacity-70">
                Email us at: <a href="mailto:support@printpowerpurpose.com" className="underline">support@printpowerpurpose.com</a>
              </p>
            </GlassCard>
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
