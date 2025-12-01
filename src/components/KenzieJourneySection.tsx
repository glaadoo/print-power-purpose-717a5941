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
          {/* kenzie-AI Puppy */}
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
            
            {/* kenzie-AI standing still - only tail area animates */}
            <div className="relative">
              {/* The puppy - with gentle bounce */}
              <img
                src={kenziePuppy}
                alt="kenzie-AI the puppy"
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
              
              {/* Butterflies */}
              <div className="absolute top-[15%] right-[25%] z-20 animate-[butterfly-orbit_4s_ease-in-out_infinite]">
                <span className="text-lg">🦋</span>
                <span className="absolute -top-2 right-0 text-xs animate-[sparkle_0.8s_ease-in-out_infinite]">✨</span>
              </div>
              
              <div className="absolute top-[45%] left-[15%] z-20 animate-[butterfly-orbit_5s_ease-in-out_infinite_1s]">
                <span className="text-base">🦋</span>
                <span className="absolute -top-2 left-0 text-xs animate-[sparkle_0.6s_ease-in-out_infinite_0.2s]">✨</span>
              </div>
              
              <div className="absolute top-[60%] right-[18%] z-20 animate-[butterfly-orbit_4.5s_ease-in-out_infinite_2s]">
                <span className="text-base">🦋</span>
                <span className="absolute -bottom-2 right-0 text-xs animate-[sparkle_0.7s_ease-in-out_infinite_0.4s]">✨</span>
              </div>
              
              {/* Fourth butterfly - lands on Kenzie's head */}
              <div className="absolute top-[5%] left-[45%] z-30 animate-[butterfly-land_8s_ease-in-out_infinite]">
                <span className="text-base">🦋</span>
                <span className="absolute -top-1 -right-1 text-xs animate-[sparkle_1s_ease-in-out_infinite_0.3s]">✨</span>
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
          <div className="flex-1 text-center md:text-left relative">
            {/* Floating dots connector - diagonal from puppy to text */}
            <div className="absolute -left-12 top-8 hidden md:block">
              <span className="absolute left-0 top-0 text-amber-500 text-2xl animate-[speech-dot_1.5s_ease-in-out_infinite]">•</span>
              <span className="absolute left-5 top-3 text-amber-500 text-xl animate-[speech-dot_1.5s_ease-in-out_infinite_0.2s]">•</span>
              <span className="absolute left-9 top-5 text-amber-500 text-lg animate-[speech-dot_1.5s_ease-in-out_infinite_0.4s]">•</span>
            </div>
            
            {/* Free-floating greeting text with walking paw prints */}
            <div className="relative inline-block mb-6 animate-fade-in">
              {/* Walking paw prints - appear and disappear in sequence */}
              {/* Right side paws - walking up, spaced out */}
              <span className="absolute -right-5 -bottom-4 text-lg animate-[paw-step-1_2.5s_ease-in-out_infinite]">🐾</span>
              <span className="absolute -right-4 top-1/2 -translate-y-1/2 text-base animate-[paw-step-2_2.5s_ease-in-out_infinite]">🐾</span>
              <span className="absolute -right-5 -top-4 text-lg animate-[paw-step-3_2.5s_ease-in-out_infinite]">🐾</span>
              
              {/* Left side paws - walking up, spaced out */}
              <span className="absolute -left-5 -bottom-4 text-base animate-[paw-step-1_2.8s_ease-in-out_infinite_0.3s]">🐾</span>
              <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-lg animate-[paw-step-2_2.8s_ease-in-out_infinite_0.3s]">🐾</span>
              <span className="absolute -left-5 -top-4 text-base animate-[paw-step-3_2.8s_ease-in-out_infinite_0.3s]">🐾</span>
              
              {/* Free-floating text - no box */}
              <p className="text-xl md:text-2xl font-medium text-gray-800 px-6">
                Hi! I'm <span className="text-amber-500 font-bold">kenzie-AI</span>. 
                <span className="block mt-1 text-gray-600">
                  I'm here to guide you! <span className="inline-block animate-[paw-wiggle_1.5s_ease-in-out_infinite]">🐾</span>
                </span>
              </p>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Your kenzie-AI Journey Starts Here
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
                I'm ready to print
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
