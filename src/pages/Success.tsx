import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Package, Heart, ArrowRight, Home, Truck, ExternalLink, Sparkles, PartyPopper } from "lucide-react";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const MILESTONE_GOAL_CENTS = 77700; // $777
const DONATION_RATIO = 77700 / 115400; // $777 donation from $1154 gross (~67.3%)

interface OrderDetails {
  order_number: string;
  amount_total_cents: number;
  donation_cents: number;
  subtotal_cents: number;
  customer_email: string;
  items: any[];
  cause_name?: string;
  nonprofit_name?: string;
  nonprofit_id?: string;
  created_at: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  tracking_carrier?: string | null;
  shipping_status?: string | null;
}

interface NonprofitProgress {
  current_progress_cents: number;
  milestone_count: number;
}

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [nonprofitProgress, setNonprofitProgress] = useState<NonprofitProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const sessionId = searchParams.get("session_id");

  // Calculate if this order's donation pushed nonprofit over milestone
  const orderDonationCents = Math.round((orderDetails?.amount_total_cents || 0) * DONATION_RATIO);
  const milestoneReached = nonprofitProgress 
    ? (nonprofitProgress.current_progress_cents % MILESTONE_GOAL_CENTS) < orderDonationCents
    : false;

  useEffect(() => {
    console.log("[SUCCESS PAGE] Session ID from URL:", sessionId);
    
    const fetchOrderDetails = async (retryCount = 0) => {
      if (!sessionId) {
        console.error("[SUCCESS PAGE] No session_id found in URL");
        setError("No payment session found");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("session_id", sessionId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setOrderDetails(data as OrderDetails);
          
          // Fetch nonprofit progress if nonprofit_id exists
          if (data.nonprofit_id) {
            const { data: npData } = await supabase
              .from("nonprofits")
              .select("current_progress_cents, milestone_count")
              .eq("id", data.nonprofit_id)
              .maybeSingle();
            
            if (npData) {
              setNonprofitProgress(npData);
            }
          }
          
          cart.clear();
          setLoading(false);
        } else if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => fetchOrderDetails(retryCount + 1), delay);
        } else {
          setError("Order not found. Please check your email for order confirmation.");
          setLoading(false);
        }
      } catch (err) {
        console.error("[SUCCESS PAGE] Error fetching order:", err);
        setError("Unable to load order details");
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionId, searchParams]);

  // Celebration effect when milestone is reached
  useEffect(() => {
    if (orderDetails?.nonprofit_name && milestoneReached && !showCelebration) {
      setShowCelebration(true);
      
      // Fire confetti
      const duration = 4000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#9B59B6"],
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#9B59B6"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [orderDetails, milestoneReached, showCelebration]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-destructive text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Unable to Load Order
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "We couldn't find your order details."}
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            <Home className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const { order_number, amount_total_cents, subtotal_cents, items, nonprofit_name } = orderDetails;

  // Calculate progress toward current milestone
  const currentProgressCents = nonprofitProgress?.current_progress_cents || 0;
  const progressTowardMilestone = currentProgressCents % MILESTONE_GOAL_CENTS;
  const progressPercent = Math.min((progressTowardMilestone / MILESTONE_GOAL_CENTS) * 100, 100);
  const nextMilestoneNumber = (nonprofitProgress?.milestone_count || 0) + 1;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-8 mb-6 text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground text-lg mb-4">
            Thank you for your order and support.
          </p>
          <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
            <span className="text-sm text-muted-foreground">Order Number:</span>
            <span className="text-lg font-semibold text-foreground">{order_number}</span>
          </div>
        </motion.div>

        {/* Nonprofit Impact Section */}
        {nonprofit_name && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`rounded-2xl p-6 mb-6 ${
              milestoneReached 
                ? "bg-gradient-to-r from-yellow-50 via-emerald-50 to-yellow-50 border-2 border-yellow-300" 
                : "bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border border-emerald-200"
            }`}
          >
            <AnimatePresence>
              {milestoneReached ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: 3, repeatDelay: 1 }}
                    >
                      <PartyPopper className="h-10 w-10 text-yellow-500" />
                    </motion.div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-8 w-8 text-emerald-500" />
                    </motion.div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-emerald-700 mb-2">
                    🎉 Great job!
                  </h2>
                  <p className="text-lg text-emerald-600 mb-2">
                    You've helped <span className="font-bold">{nonprofit_name}</span> reach their $777 milestone!
                  </p>
                  <p className="text-sm text-emerald-500 mt-3">
                    You're making a real impact. Thank you for being part of this journey! 💚
                  </p>
                </motion.div>
              ) : (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Heart className="h-6 w-6 text-emerald-600" />
                    <h2 className="text-xl font-bold text-emerald-700">
                      You're Making a Difference!
                    </h2>
                  </div>
                  
                  <p className="text-emerald-600 mb-4">
                    Your purchase supports <span className="font-bold">{nonprofit_name}</span>
                  </p>
                  
                  {nonprofitProgress && (
                    <div className="max-w-md mx-auto mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-emerald-600">Progress to Milestone #{nextMilestoneNumber}</span>
                        <span className="font-bold text-emerald-700">{progressPercent.toFixed(0)}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-3" />
                      <p className="text-xs text-emerald-500 mt-1">
                        ${(progressTowardMilestone / 100).toFixed(0)} of $777
                      </p>
                    </div>
                  )}
                  
                  <p className="text-sm text-emerald-600 mb-4">
                    Every order brings them closer to their <span className="font-bold">$777 Impact Milestone</span>.
                  </p>
                  
                  <p className="text-emerald-500 text-sm italic">
                    Want to help power their next breakthrough?
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Order Summary */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Summary
          </h2>

          {items && items.length > 0 && (
            <div className="space-y-3 mb-6">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start py-3 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.product_name || item.name || "Product"}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                    {item.configuration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.entries(item.configuration).map(([key, value]) => `${key}: ${value}`).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      ${((item.final_price_per_unit_cents || item.priceCents || 0) / 100).toFixed(2)} each
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: ${(((item.final_price_per_unit_cents || item.priceCents || 0) * (item.quantity || 1)) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${((subtotal_cents || 0) / 100).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
              <span>Total</span>
              <span>${(amount_total_cents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Tracking Info */}
        {orderDetails.tracking_number ? (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Tracking Information
            </h2>
            <div className="space-y-3">
              {orderDetails.tracking_carrier && (
                <div>
                  <span className="text-sm text-muted-foreground">Carrier:</span>
                  <p className="font-medium">{orderDetails.tracking_carrier}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Tracking Number:</span>
                <p className="font-mono text-lg">{orderDetails.tracking_number}</p>
              </div>
              {orderDetails.tracking_url && (
                <Button asChild variant="default">
                  <a href={orderDetails.tracking_url} target="_blank" rel="noopener noreferrer">
                    Track Package <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Processing
            </h2>
            <p className="text-muted-foreground">
              Your order is being processed. Tracking information will appear here once your package ships.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            size="lg"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button
            onClick={() => navigate("/orders")}
            variant="default"
            size="lg"
          >
            View Orders
          </Button>
          <Button
            onClick={() => navigate("/products")}
            variant="outline"
            size="lg"
            className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Email Confirmation Note */}
        {orderDetails.customer_email && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            A confirmation email has been sent to {orderDetails.customer_email}
          </p>
        )}
      </div>
      <Footer />
    </div>
  );
}
