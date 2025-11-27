import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import kenzieMascot from "@/assets/kenzie-mascot.png";
import { Sparkles, ShoppingBag } from "lucide-react";

export default function KenzieJourneySection() {
  const nav = useNavigate();
  const [showWoof, setShowWoof] = useState(false);

  // Toggle woof bubble periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setShowWoof(true);
      setTimeout(() => setShowWoof(false), 2000);
    }, 5000);
    
    // Show initially after a short delay
    const initialTimeout = setTimeout(() => setShowWoof(true), 1000);
    const hideInitial = setTimeout(() => setShowWoof(false), 3000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      clearTimeout(hideInitial);
    };
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-amber-50/30 to-orange-50/40 py-16 overflow-hidden">
      {/* Decorative paw prints background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute text-4xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          >
            🐾
          </span>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Kenzie Puppy with animations */}
          <div className="relative flex-shrink-0">
            {/* Soft glow effect */}
            <div className="absolute inset-0 bg-gradient-radial from-amber-200/50 via-amber-100/30 to-transparent rounded-full blur-2xl scale-150 animate-pulse" />
            
            {/* Woof woof bubble */}
            <div 
              className={`absolute -top-8 -right-4 z-20 transition-all duration-300 ${
                showWoof 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-2 scale-90'
              }`}
            >
              <div className="relative bg-white rounded-2xl px-4 py-2 shadow-lg border-2 border-amber-200">
                <span className="text-lg font-bold text-amber-600 whitespace-nowrap">
                  Woof woof! 🐕
                </span>
                {/* Bubble tail */}
                <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
                <div className="absolute -bottom-3 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-amber-200" style={{ zIndex: -1 }} />
              </div>
            </div>
            
            {/* Kenzie container with bounce animation */}
            <div className="relative animate-[kenzie-bounce_2s_ease-in-out_infinite]">
              {/* The puppy image */}
              <img
                src={kenzieMascot}
                alt="Kenzie the puppy mascot"
                className="w-44 h-44 md:w-56 md:h-56 object-contain drop-shadow-xl relative z-10"
                style={{
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))',
                }}
              />
              
              {/* Tail wag sparkles */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 animate-[wiggle_0.3s_ease-in-out_infinite]">
                <span className="text-2xl">✨</span>
              </div>
              
              {/* Floating hearts around Kenzie */}
              <div className="absolute -top-4 right-0 animate-[float_2s_ease-in-out_infinite]">
                <span className="text-xl">💛</span>
              </div>
              <div className="absolute top-8 -left-6 animate-[float_2.5s_ease-in-out_infinite_0.3s]">
                <span className="text-lg">💙</span>
              </div>
              <div className="absolute -bottom-2 right-4 animate-[float_1.8s_ease-in-out_infinite_0.6s]">
                <span className="text-lg">🧡</span>
              </div>
              
              {/* Happy expression indicator */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 animate-[float_1.5s_ease-in-out_infinite]">
                <span className="text-lg">😊</span>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 text-center md:text-left">
            {/* Main greeting speech bubble */}
            <div className="relative inline-block bg-white rounded-2xl px-6 py-4 shadow-lg mb-6 animate-fade-in border border-amber-100">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white hidden md:block" />
              <p className="text-xl md:text-2xl font-medium text-gray-800">
                Hi! I'm <span className="text-amber-500 font-bold">Kenzie</span>. 
                <span className="block mt-1 text-gray-600">I'm here to guide you! 🐾</span>
              </p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Your Kenzie Journey Starts Here
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto md:mx-0">
              Let me help you create amazing prints that support causes you care about!
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={() => nav("/welcome")}
                className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5 group-hover:animate-spin" />
                Ready to Print
                <span className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => nav("/products")}
                className="group relative inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-8 py-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <ShoppingBag className="w-5 h-5 text-blue-600 group-hover:animate-bounce" />
                Explore Our Products
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative wave */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-amber-200/30 via-blue-200/30 to-amber-200/30" />
    </section>
  );
}
