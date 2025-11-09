import { PawPrint } from "lucide-react";
import { motion } from "framer-motion";

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
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-20 right-0 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border whitespace-nowrap"
      >
        <p className="text-sm font-medium text-foreground">Need help?</p>
      </motion.div>

      {/* Small decorative paws */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: [0.4, 0.7, 0.4],
          scale: 1,
          rotate: -15
        }}
        transition={{ 
          opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          scale: { delay: 0.8, duration: 0.3 }
        }}
        className="absolute -top-2 -left-2 text-primary"
      >
        <PawPrint className="w-5 h-5" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          scale: 1,
          rotate: 25
        }}
        transition={{ 
          opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          scale: { delay: 1, duration: 0.3 }
        }}
        className="absolute -bottom-1 -left-3 text-primary/80"
      >
        <PawPrint className="w-5 h-5" />
      </motion.div>

      {/* Main button */}
      <motion.button
        onClick={handleClick}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg hover:shadow-2xl transition-all flex items-center justify-center group"
        whileHover={{ scale: 1.15, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          y: [0, -8, 0],
          rotate: [0, -3, 3, 0]
        }}
        transition={{ 
          scale: { duration: 0.3, ease: "easeOut" },
          opacity: { duration: 0.3, ease: "easeOut" },
          y: { 
            duration: 3, 
            ease: "easeInOut", 
            repeat: Infinity,
            repeatDelay: 0.5
          },
          rotate: {
            duration: 4,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 1
          }
        }}
        aria-label="Open chatbot"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        >
          <PawPrint className="w-7 h-7" />
        </motion.div>
        
        {/* Gentle pulse animation */}
        <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-10" style={{ animationDuration: '2s' }} />
      </motion.button>
    </div>
  );
}
