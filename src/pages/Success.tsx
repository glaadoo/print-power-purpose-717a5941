import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useCause } from "../context/CauseContext";
import VideoBackground from "@/components/VideoBackground";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function Success() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { clear: clearCart } = useCart();
  const { clearAll: clearCauseAndNonprofit } = useCause();
  const [orderInfo, setOrderInfo] = useState<{ order_number?: string; order_id?: string } | null>(null);

  const orderId = sp.get("orderId");

  useEffect(() => {
    // Clear cart, cause, nonprofit & any pending checkout selection
    clearCart();
    clearCauseAndNonprofit();
    try {
      localStorage.removeItem("ppp:cart");
      localStorage.removeItem("ppp:checkout");
    } catch {}
  }, [clearCart, clearCauseAndNonprofit]);

  // Fetch order info by orderId - with retry polling
  useEffect(() => {
    if (!orderId) return;
    
    let attempts = 0;
    const maxAttempts = 5;
    
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('order_number, id, amount_total_cents, status')
          .eq('id', orderId)
          .single();
        
        if (!error && data) {
          setOrderInfo({
            order_number: data.order_number,
            order_id: data.id
          });
          return true;
        }
        return false;
      } catch (e) {
        console.error('Failed to fetch order', e);
        return false;
      }
    };
    
    // Initial fetch
    fetchOrder().then(success => {
      if (success) return;
      
      // Poll every second for up to 5 attempts if initial fetch fails
      const interval = setInterval(async () => {
        attempts++;
        const success = await fetchOrder();
        if (success || attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 1000);
    });
  }, [orderId]);

  return (
    <div className="min-h-screen text-white relative">
      {/* Top bar - Brand only, no navigation buttons */}
      <header className="sticky top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <Link
          to="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </Link>
      </header>

      {/* Main content */}
      <div className="relative">
        <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
          <div className="absolute inset-0 pointer-events-none">
            <VideoBackground
              srcMp4="/media/hero.mp4"
              srcWebm="/media/hero.webm"
              poster="/media/hero-poster.jpg"
              overlay={<div className="absolute inset-0 bg-black/50 pointer-events-none" />}
            />
          </div>

          <div className="relative w-full max-w-2xl mx-auto z-10 pointer-events-auto">
            <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8 text-center pointer-events-auto">
              <div className="mb-6">
                <svg className="w-20 h-20 mx-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h1 className="text-3xl md:text-4xl font-serif font-semibold mb-4">
                Payment Successful!
              </h1>
              
              <p className="text-lg opacity-90 mb-2">
                Thank you for your support.
              </p>

              {orderInfo?.order_number ? (
                <div className="mt-6 p-4 rounded-lg bg-white/10 border border-white/20">
                  <p className="text-sm opacity-70 mb-1">Your Order Number:</p>
                  <p className="text-2xl font-semibold tracking-wider">{orderInfo.order_number}</p>
                </div>
              ) : orderId ? (
                <p className="mt-4 text-sm opacity-70">Loading order details...</p>
              ) : (
                <p className="mt-4 text-sm opacity-70">We couldn't locate your order. Please contact support.</p>
              )}

              <p className="mt-6 text-base opacity-90">What would you like to do next?</p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => navigate("/")}
                  variant="default"
                  size="lg"
                  className="rounded-full bg-white text-black hover:bg-white/90 w-full sm:w-auto"
                >
                  Back to Home
                </Button>
                <Button 
                  onClick={() => navigate("/products")}
                  variant="outline"
                  size="lg"
                  className="rounded-full bg-white/20 border-white/30 text-white hover:bg-white/30 w-full sm:w-auto"
                >
                  Continue Shopping
                </Button>
                <Button 
                  onClick={() => navigate("/select/nonprofit?flow=shopping")}
                  variant="outline"
                  size="lg"
                  className="rounded-full bg-white/20 border-white/30 text-white hover:bg-white/30 w-full sm:w-auto"
                >
                  Choose Another Cause
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
