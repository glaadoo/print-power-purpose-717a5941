// src/components/MenuOverlay.tsx
import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "./VideoBackground";

type Item = { label: string; href: string };
type Props = { open: boolean; onClose: () => void; items?: Item[]; showSignOut?: boolean };

/** Animation settings for staggered entry/exit */
const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, x: -18, transition: { duration: 0.18 } },
};

export default function MenuOverlay({ open, onClose, items, showSignOut = false }: Props) {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Use provided items or fall back to default menu items
  const menuItems: Item[] = items || [
    { label: "About", href: "/about" },
    { label: "Solutions", href: "#solutions" },
    { label: "Learn", href: "#learn" },
    { label: "Insights", href: "/insights" },
    { label: "News", href: "/news" },
    { label: "Contact", href: "/contact" },
    { label: "Donate", href: "/causes?flow=donation" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu-root"
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dimmed background */}
          <button
            onClick={onClose}
            className="absolute inset-0 cursor-default"
            aria-label="Close menu backdrop"
          >
            <div className="absolute inset-0 -z-10">
              <VideoBackground
                srcMp4="/media/hero.mp4"
                srcWebm="/media/hero.webm"
                poster="/media/hero-poster.jpg"
                parallaxVh={0}
                overlay={<div className="absolute inset-0 bg-black/55" />}
              />
            </div>
          </button>

          {/* Left slide-in panel */}
          <motion.aside
            onClick={(e) => e.stopPropagation()}
            className="
              fixed left-0 top-0 h-full
              w-[min(420px,90vw)] sm:w-[min(460px,85vw)]
              lg:w-1/3 xl:w-1/4
              bg-white/10 backdrop-blur-xl
              border-r border-white/20
              text-white shadow-2xl
              flex flex-col
              rounded-r-2xl
            "
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            {/* Circular close “X” */}
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="
                absolute top-4 right-4
                size-9 rounded-full
                border border-white/30
                bg-white/10 hover:bg-white/20
                grid place-items-center
              "
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="text-xs uppercase tracking-[0.2em] opacity-80">
                PRINT POWER PURPOSE
              </div>
            </div>

            {/* Divider under header */}
            <div className="mx-4 mt-3 mb-4 border-t border-white/20" />

            {/* Animated text-only menu list */}
            <nav className="px-4 pb-4 overflow-y-auto">
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-col gap-2 items-end text-right"
              >
                {menuItems.map((it) => (
                  <motion.li key={it.href} variants={itemVariants} className="w-full">
                    {it.href.startsWith('#') ? (
                      <a
                        href={it.href}
                        onClick={(e) => {
                          e.preventDefault();
                          const id = it.href.substring(1);
                          const element = document.getElementById(id);
                          if (element) {
                            const headerOffset = 80;
                            const elementPosition = element.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                            window.scrollTo({
                              top: offsetPosition,
                              behavior: "smooth"
                            });
                          }
                          onClose();
                        }}
                        className="
                          inline-block ml-auto
                          text-white/90 hover:text-white
                          text-lg md:text-xl font-semibold
                          tracking-wide
                          transition-all hover:translate-x-1
                        "
                      >
                        {it.label}
                      </a>
                    ) : (
                      <Link
                        to={it.href}
                        onClick={(e) => {
                          console.log(`Navigating to: ${it.href}`);
                          onClose();
                        }}
                        className="
                          inline-block ml-auto
                          text-white/90 hover:text-white
                          text-lg md:text-xl font-semibold
                          tracking-wide
                          transition-all hover:translate-x-1
                        "
                      >
                        {it.label}
                      </Link>
                    )}
                  </motion.li>
                ))}
              </motion.ul>

              {/* Bottom divider */}
              <div className="mt-6 border-t border-white/15" />

              {/* Chat with Kenzie CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
                className="mt-5 w-full flex justify-end"
              >
                <button
                  onClick={() => {
                    onClose();
                    window.kenzieOpenChat?.();
                  }}
                  className="
                    rounded-full px-5 py-3
                    bg-white/10 text-white font-semibold
                    hover:bg-white/20
                    border border-white/30
                  "
                >
                  Kenzie
                </button>
              </motion.div>

              {showSignOut ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                  className="mt-4 w-full flex justify-end"
                >
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate("/auth");
                      onClose();
                    }}
                    className="
                      rounded-full px-5 py-3
                      bg-white/10 text-white font-semibold
                      hover:bg-white/20
                      border border-white/30
                    "
                  >
                    Sign Out
                  </button>
                </motion.div>
              ) : null}
            </nav>

            {/* Footer */}
            <div className="mt-auto px-5 pb-5 text-xs opacity-70">
              © {new Date().getFullYear()} PPP
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

