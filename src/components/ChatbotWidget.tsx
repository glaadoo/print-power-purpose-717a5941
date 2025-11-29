import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import kenziePuppy from "@/assets/kenzie-standing.png";

export default function ChatbotWidget() {
  const [showWoof, setShowWoof] = useState(false);

  // Toggle woof bubble periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setShowWoof(true);
      setTimeout(() => setShowWoof(false), 2000);
    }, 6000);
    
    // Show initially after a short delay
    const initialTimeout = setTimeout(() => setShowWoof(true), 2000);
    const hideInitial = setTimeout(() => setShowWoof(false), 4000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      clearTimeout(hideInitial);
    };
  }, []);

  const handleClick = () => {
    // Trigger the KenzieChat to open using the global function
    if (window.kenzieOpenChat) {
      window.kenzieOpenChat();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat with Kenzie bubble */}
      <motion.button
        onClick={handleClick}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="absolute bottom-20 right-0 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border whitespace-nowrap hover:bg-background transition-colors cursor-pointer"
      >
        <p className="text-sm font-medium text-foreground">Chat with Kenzie</p>
      </motion.button>

      {/* Woof speech bubble */}
      <div 
        className={`absolute -top-2 -left-4 z-30 transition-all duration-300 pointer-events-none ${
          showWoof 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-2 scale-90'
        }`}
      >
        <div className="relative bg-white rounded-xl px-3 py-1.5 shadow-md border-2 border-amber-200">
          <span className="text-sm font-bold text-amber-600 whitespace-nowrap">
            Woof!
          </span>
          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 right-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
          <div className="absolute -bottom-[11px] right-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-200" style={{ zIndex: -1 }} />
        </div>
      </div>

      {/* Kenzie dog button */}
      <motion.button
        onClick={handleClick}
        className="w-20 h-20 rounded-full bg-white shadow-lg hover:shadow-2xl transition-all flex items-center justify-center overflow-hidden border-2 border-amber-200"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          y: [0, -6, 0]
        }}
        transition={{ 
          scale: { duration: 0.3, ease: "easeOut" },
          opacity: { duration: 0.3, ease: "easeOut" },
          y: { 
            duration: 2.5, 
            ease: "easeInOut", 
            repeat: Infinity,
            repeatDelay: 0.5
          }
        }}
        aria-label="Chat with Kenzie"
      >
        <img 
          src={kenziePuppy} 
          alt="Kenzie" 
          className="w-16 h-16 object-contain"
        />
      </motion.button>
    </div>
  );
}
