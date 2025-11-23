import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FloatingCartBar() {
  const { items, totalCents } = useCart();
  const navigate = useNavigate();
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = itemCount > 0;

  if (!hasItems) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100%-2rem)] md:w-auto"
      >
        <div className="rounded-2xl bg-gradient-to-r from-primary/95 to-primary-glow/95 backdrop-blur-lg border border-white/20 shadow-elegant p-4">
          <div className="flex items-center justify-between gap-4 md:gap-6">
            {/* Cart Icon + Count - Clickable */}
            <button
              onClick={() => navigate("/cart")}
              className="flex items-center gap-3 hover:bg-white/10 rounded-lg p-2 -m-2 transition-colors"
              aria-label="View cart"
            >
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-white" />
                <span className="absolute -top-2 -right-2 bg-white text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <div className="hidden sm:block">
                <div className="text-xs text-white/80 uppercase tracking-wide">Cart</div>
                <div className="text-sm font-semibold text-white">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </div>
              </div>
            </button>

            {/* Total */}
            <div className="text-right">
              <div className="text-xs text-white/80 uppercase tracking-wide">Total</div>
              <div className="text-xl md:text-2xl font-bold text-white">
                ${(totalCents / 100).toFixed(2)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/causes")}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-all border border-white/30"
                aria-label="Add donation"
              >
                <Heart className="w-4 h-4" />
                <span>Donate More</span>
              </button>
              
              <button
                onClick={() => navigate("/checkout")}
                className="px-6 md:px-8 py-2 md:py-3 rounded-full bg-white text-primary font-bold hover:bg-white/90 transition-all shadow-lg hover:shadow-glow"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
