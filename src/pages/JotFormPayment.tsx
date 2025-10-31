import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import VideoBackground from "@/components/VideoBackground";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function JotFormPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || searchParams.get("orderId");
  const orderNumber = searchParams.get("order_number") || searchParams.get("orderNumber");
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!orderId && !orderNumber) {
      toast.error("No order information provided");
      navigate("/");
      return;
    }
    
    loadOrder();
  }, [orderId, orderNumber]);

  const loadOrder = async () => {
    try {
      let query = supabase.from("orders").select("*");

      if (orderId) {
        query = query.eq("id", orderId);
      } else if (orderNumber) {
        query = query.eq("order_number", orderNumber);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      
      if (!data) {
        toast.error("Order not found");
        navigate("/");
        return;
      }

      // Check if already completed
      if (data.status === "completed") {
        toast.success("This order has already been paid");
        navigate("/");
        return;
      }

      setOrder(data);
    } catch (error: any) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!order) return;

    setProcessing(true);
    try {
      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke("checkout-session", {
        body: {
          productName: order.product_name || "Product Order",
          unitAmountCents: order.amount_total_cents || 0,
          quantity: order.quantity || 1,
          causeId: order.cause_id,
          donationUsd: (order.donation_cents || 0) / 100,
          currency: order.currency || "usd",
          successPath: `/?payment=success`,
          cancelPath: `/jotform-payment?order_id=${order.id}&payment=cancelled`,
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            customer_email: order.customer_email
          }
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "Failed to process payment");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/70" />}
        />
        <div className="relative text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col">
      <VideoBackground
        srcMp4="/media/hero.mp4"
        srcWebm="/media/hero.webm"
        poster="/media/hero-poster.jpg"
        overlay={<div className="absolute inset-0 bg-black/70" />}
      />

      {/* Header */}
      <header className="relative px-4 md:px-6 py-4 flex items-center justify-center text-white backdrop-blur-md bg-black/30 border-b border-white/10">
        <h1 className="text-sm md:text-base font-semibold uppercase tracking-[0.2em]">
          Complete Your Order
        </h1>
      </header>

      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-6">Order Summary</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-3 border-b border-white/20">
              <span className="text-white/70">Order Number:</span>
              <span className="font-semibold">{order.order_number}</span>
            </div>

            {order.customer_email && (
              <div className="flex justify-between py-3 border-b border-white/20">
                <span className="text-white/70">Email:</span>
                <span className="font-semibold">{order.customer_email}</span>
              </div>
            )}

            {order.product_name && (
              <div className="flex justify-between py-3 border-b border-white/20">
                <span className="text-white/70">Product:</span>
                <span className="font-semibold">{order.product_name}</span>
              </div>
            )}

            <div className="flex justify-between py-3 border-b border-white/20">
              <span className="text-white/70">Quantity:</span>
              <span className="font-semibold">{order.quantity}</span>
            </div>

            {order.donation_cents > 0 && (
              <div className="flex justify-between py-3 border-b border-white/20">
                <span className="text-white/70">Donation:</span>
                <span className="font-semibold text-green-400">
                  ${(order.donation_cents / 100).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-4 text-xl font-bold">
              <span>Total Amount:</span>
              <span className="text-green-400">
                ${(order.amount_total_cents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-6 text-lg rounded-full transition-all transform hover:scale-105 shadow-lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Proceed to Payment"
            )}
          </Button>

          <p className="text-center text-white/60 text-sm mt-4">
            You will be redirected to Stripe to complete your payment securely
          </p>
        </div>
      </div>
    </div>
  );
}