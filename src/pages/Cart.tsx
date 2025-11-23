import { useMemo, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import { X, ArrowLeft, ArrowRight, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function Cart() {
  const { items, count, totalCents, setQty, remove, clear } = useCart();
  const nav = useNavigate();

  useEffect(() => {
    console.log('[Cart] Component mounted');
    document.title = "Cart - Print Power Purpose";
    
    return () => {
      console.log('[Cart] Component unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('[Cart] Items updated:', items.length, 'items');
    
    // Validate cart items - remove products that no longer exist
    async function validateCartItems() {
      if (items.length === 0) return;
      
      const invalidIds: string[] = [];
      
      for (const item of items) {
        const { data, error } = await supabase
          .from("products")
          .select("id")
          .eq("id", item.id)
          .maybeSingle();
        
        if (error || !data) {
          invalidIds.push(item.id);
        }
      }
      
      if (invalidIds.length > 0) {
        invalidIds.forEach(id => remove(id));
        toast.error(`${invalidIds.length} invalid product(s) removed from cart.`);
      }
    }
    
    validateCartItems();
  }, []);

  const hasItems = items.length > 0;

  // Compute per-line totals
  const detailed = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        lineCents: it.priceCents * it.quantity,
      })),
    [items]
  );

  const subtotal = totalCents;

  return (
    <div className="fixed inset-0 text-white">{/* Removed z-50 to work with App animation wrapper */}
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <Button
          onClick={() => nav(-1)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          CART
        </h1>
        <button 
          className="rounded-full px-4 py-2 bg-white/10 text-white hover:bg-white/20 border border-white/50 flex items-center gap-2 relative"
          onClick={() => nav("/products")}
          aria-label="Cart"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-semibold">{count} items</span>
            <span className="text-[10px] opacity-90">${(totalCents / 100).toFixed(2)}</span>
          </div>
        </button>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16 pb-4 md:pb-8 lg:pb-12">
        <section className="relative min-h-[calc(100vh-4rem)]">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full min-h-[calc(100vh-4rem)]" >
            {!hasItems ? (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="max-w-2xl w-full rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-8 text-center">
                  <p className="opacity-90 mb-6">Your cart is empty.</p>
                  <button 
                    className="rounded-full px-8 py-3 bg-white text-black font-semibold hover:bg-white/90"
                    onClick={() => nav("/products")}
                  >
                    Browse Products
                  </button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 z-10 p-6 md:p-8 flex flex-col">
                <ul className="divide-y divide-white/20 mb-6">
                  {detailed.map((it) => (
                    <li key={it.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          className="w-16 h-16 object-cover rounded-lg"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white/20 grid place-items-center text-xs">
                          NO IMG
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg">{it.name}</div>
                        <div className="text-sm opacity-80">
                          ${(it.priceCents / 100).toFixed(2)} each
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl font-semibold"
                          onClick={() => setQty(it.id, Math.max(1, it.quantity - 1))}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => setQty(it.id, Number(e.target.value || 1))}
                          className="w-14 h-10 rounded-lg bg-white/90 text-black text-center outline-none font-semibold"
                        />

                        <button
                          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xl font-semibold"
                          onClick={() => setQty(it.id, it.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>

                        <button 
                          className="ml-2 w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center"
                          onClick={() => remove(it.id)}
                          aria-label="Remove item"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Action buttons and Subtotal */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-center mt-8 mb-6 border-t border-white/20 pt-6">
                  <button
                    className="px-8 py-4 rounded-full bg-white/20 text-white font-semibold hover:bg-white/30 border border-white/50 shadow-lg backdrop-blur-sm w-full sm:w-auto flex items-center gap-2 justify-center"
                    onClick={() => nav("/products")}
                  >
                    <ArrowLeft size={20} />
                    Continue Shopping
                  </button>
                  
                  <div className="text-center">
                    <div className="opacity-80 text-sm mb-2">Subtotal</div>
                    <div className="text-3xl font-bold">
                      ${(totalCents / 100).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <button 
                      className="px-6 py-3 rounded-full bg-white/20 text-white font-semibold hover:bg-white/30 border border-white/50 shadow-lg backdrop-blur-sm w-full sm:w-auto"
                      onClick={clear}
                    >
                      Clear Cart
                    </button>
                    
                    <button
                      className="px-8 py-4 rounded-full bg-white/20 text-white font-semibold hover:bg-white/30 border border-white/50 shadow-lg backdrop-blur-sm w-full sm:w-auto flex items-center gap-2 justify-center"
                      onClick={() => nav("/checkout", { state: { fromCart: true } })}
                    >
                      Checkout
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}

