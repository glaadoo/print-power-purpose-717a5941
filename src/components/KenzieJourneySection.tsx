import { useNavigate } from "react-router-dom";
import kenzieMascot from "@/assets/kenzie-mascot.png";
import { Sparkles, ShoppingBag } from "lucide-react";

export default function KenzieJourneySection() {
  const nav = useNavigate();

  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-amber-50/30 to-orange-50/40 py-16 overflow-hidden">
      {/* Decorative paw prints background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
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
          {/* Kenzie Mascot with animations */}
          <div className="relative flex-shrink-0">
            {/* Glow effect behind Kenzie */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-300/40 to-orange-300/40 rounded-full blur-3xl animate-pulse scale-110" />
            
            {/* Kenzie image with bounce animation */}
            <div className="relative animate-[bounce_3s_ease-in-out_infinite]">
              <img
                src={kenzieMascot}
                alt="Kenzie the puppy mascot"
                className="w-40 h-40 md:w-52 md:h-52 object-contain drop-shadow-2xl"
              />
              
              {/* Tail wag effect - sparkles */}
              <div className="absolute -right-2 top-1/2 animate-[wiggle_0.5s_ease-in-out_infinite]">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              
              {/* Floating hearts */}
              <div className="absolute -top-2 -right-4 animate-[float_2s_ease-in-out_infinite]">
                <span className="text-2xl">💛</span>
              </div>
              <div className="absolute top-4 -left-4 animate-[float_2.5s_ease-in-out_infinite_0.5s]">
                <span className="text-xl">💙</span>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 text-center md:text-left">
            {/* Speech bubble */}
            <div className="relative inline-block bg-white rounded-2xl px-6 py-4 shadow-lg mb-6 animate-fade-in">
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
