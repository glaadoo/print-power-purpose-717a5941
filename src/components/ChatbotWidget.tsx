import { motion } from "framer-motion";
import kenziePuppy from "@/assets/kenzie-standing.png";

export default function ChatbotWidget() {
  const handleClick = () => {
    // Trigger the KenzieChat to open using the global function
    if (window.kenzieOpenChat) {
      window.kenzieOpenChat();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Message bubble */}
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
