import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useCause } from "../context/CauseContext";
import VideoBackground from "@/components/VideoBackground";

export default function Success() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  // Guard hooks to avoid runtime crashes if providers are missing
  let clearCart: () => void = () => {};
  let causeName: string | undefined;
  try {
    clearCart = useCart().clear;
  } catch {}
  try {
    const c = useCause().cause as any;
    causeName = c?.name;
  } catch {}
  const navigate = useNavigate();

  useEffect(() => {
    // Clear cart & any pending checkout selection so badges/state reset immediately.
    clearCart();
    try {
      localStorage.removeItem("ppp:cart");
      localStorage.removeItem("ppp:checkout");
    } catch {}
  }, [clearCart]);

  return (
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        {/* Left: Home */}
        <a
          href="/"
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Home</span>
        </a>

        {/* Center: Brand */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <a
            href="/"
            className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
            aria-label="Print Power Purpose Home"
          >
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
        </div>

        {/* Right: Find Causes */}
        <a
          href="/causes"
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Find causes"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Find Causes</span>
        </a>
      </header>

      {/* Main content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-2xl mx-auto">
            <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8 text-center">
              <div className="mb-6">
                <svg className="w-20 h-20 mx-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h1 className="text-3xl md:text-4xl font-serif font-semibold mb-4">
                Payment Successful!
              </h1>
              
              <p className="text-lg opacity-90 mb-2">
                {causeName ? `Thank you for supporting ${causeName}!` : "Thank you for your support."}
              </p>

              {sessionId && (
                <p className="mt-4 text-sm opacity-70">Session ID: {sessionId}</p>
              )}

              <p className="mt-6 text-base opacity-90">What would you like to do next?</p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  className="rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90"
                  onClick={() => window.location.assign("/")}
                >
                  Back to Home
                </button>
                <button 
                  className="rounded-full px-6 py-3 bg-white/20 border border-white/30 text-white font-semibold hover:bg-white/30"
                  onClick={() => window.location.assign("/products")}
                >
                  Continue Shopping
                </button>
                <button 
                  className="rounded-full px-6 py-3 bg-white/20 border border-white/30 text-white font-semibold hover:bg-white/30"
                  onClick={() => window.location.assign("/causes")}
                >
                  Choose Another Cause
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
