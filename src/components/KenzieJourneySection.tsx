import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import kenziePuppy from "@/assets/kenzie-standing.png";
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
    
    const initialTimeout = setTimeout(() => setShowWoof(true), 1000);
    const hideInitial = setTimeout(() => setShowWoof(false), 3000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      clearTimeout(hideInitial);
    };
  }, []);

  return (
    <section className="relative bg-white py-16 overflow-hidden">
      {/* Subtle paw prints background */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className="absolute text-4xl"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          >
            🐾
          </span>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Kenzie Puppy */}
          <div className="relative flex-shrink-0">
            {/* Woof woof bubble */}
            <div 
              className={`absolute -top-6 right-0 z-20 transition-all duration-300 ${
                showWoof 
                  ? 'opacity-100 translate-y-0 scale-100' 
                  : 'opacity-0 translate-y-2 scale-90'
              }`}
            >
              <div className="relative bg-white rounded-2xl px-4 py-2 shadow-lg border-2 border-amber-200">
                <span className="text-lg font-bold text-amber-600 whitespace-nowrap">
                  Woof woof! 🐕
                </span>
                <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
              </div>
            </div>
            
            {/* Kenzie standing still - only tail area animates */}
            <div className="relative">
              {/* The puppy - with gentle bounce */}
              <img
                src={kenziePuppy}
                alt="Kenzie the puppy"
                className="w-72 h-72 md:w-96 md:h-96 object-contain relative z-10 animate-[puppy-bounce_2s_ease-in-out_infinite]"
              />
              
              {/* Floating hearts - very close to puppy */}
              <div className="absolute top-[25%] right-[22%] z-20 animate-[float_2s_ease-in-out_infinite]">
                <span className="text-lg">💛</span>
              </div>
              <div className="absolute top-[40%] left-[18%] z-20 animate-[float_2.5s_ease-in-out_infinite_0.3s]">
                <span className="text-base">💙</span>
              </div>
              <div className="absolute top-[18%] left-[30%] z-20 animate-[float_1.8s_ease-in-out_infinite_0.5s]">
                <span className="text-base">🧡</span>
              </div>
              
              {/* Butterflies with motion blur wing effect */}
              <div className="absolute top-[15%] right-[25%] z-20 animate-[butterfly-orbit_4s_ease-in-out_infinite]">
                <div className="relative">
                  {/* Motion blur ghost wings */}
                  <span className="absolute text-lg opacity-30 blur-[1px] animate-[wing-flap-blur_0.15s_ease-in-out_infinite]">🦋</span>
                  <span className="absolute text-lg opacity-20 blur-[2px] animate-[wing-flap-blur_0.15s_ease-in-out_infinite_0.05s]">🦋</span>
                  {/* Main butterfly */}
                  <span className="relative text-lg animate-[wing-flap_0.12s_ease-in-out_infinite]">🦋</span>
                </div>
                <span className="absolute -top-2 right-0 text-xs animate-[sparkle_0.8s_ease-in-out_infinite]">✨</span>
              </div>
              
              <div className="absolute top-[45%] left-[15%] z-20 animate-[butterfly-orbit_5s_ease-in-out_infinite_1s]">
                <div className="relative">
                  <span className="absolute text-base opacity-30 blur-[1px] animate-[wing-flap-blur_0.12s_ease-in-out_infinite]">🦋</span>
                  <span className="absolute text-base opacity-20 blur-[2px] animate-[wing-flap-blur_0.12s_ease-in-out_infinite_0.04s]">🦋</span>
                  <span className="relative text-base animate-[wing-flap_0.1s_ease-in-out_infinite]">🦋</span>
                </div>
                <span className="absolute -top-2 left-0 text-xs animate-[sparkle_0.6s_ease-in-out_infinite_0.2s]">✨</span>
              </div>
              
              <div className="absolute top-[60%] right-[18%] z-20 animate-[butterfly-orbit_4.5s_ease-in-out_infinite_2s]">
                <div className="relative">
                  <span className="absolute text-base opacity-30 blur-[1px] animate-[wing-flap-blur_0.14s_ease-in-out_infinite]">🦋</span>
                  <span className="absolute text-base opacity-20 blur-[2px] animate-[wing-flap-blur_0.14s_ease-in-out_infinite_0.05s]">🦋</span>
                  <span className="relative text-base animate-[wing-flap_0.11s_ease-in-out_infinite]">🦋</span>
                </div>
                <span className="absolute -bottom-2 right-0 text-xs animate-[sparkle_0.7s_ease-in-out_infinite_0.4s]">✨</span>
              </div>
              
              {/* Extra floating sparkles near puppy */}
              <div className="absolute top-[30%] right-[35%] z-20 animate-[sparkle_1.2s_ease-in-out_infinite]">
                <span className="text-xs">✨</span>
              </div>
              <div className="absolute top-[55%] left-[25%] z-20 animate-[sparkle_1s_ease-in-out_infinite_0.5s]">
                <span className="text-xs">✨</span>
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
    </section>
  );
}
