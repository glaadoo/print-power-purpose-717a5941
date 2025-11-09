import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatbotWidget() {
  const handleClick = () => {
    // Trigger the KenzieChat to open using the global function
    if (window.kenzieOpenChat) {
      window.kenzieOpenChat();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-label="Open chatbot"
    >
      <MessageCircle className="w-6 h-6" />
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
    </motion.button>
  );
}
