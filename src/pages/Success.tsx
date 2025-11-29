import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, DollarSign, Heart, ArrowRight, Home, Truck, ExternalLink } from "lucide-react";
import Footer from "@/components/Footer";

interface OrderDetails {
  order_number: string;
  amount_total_cents: number;
  donation_cents: number;
  subtotal_cents: number;
  customer_email: string;
  items: any[];
  cause_name?: string;
  nonprofit_name?: string;
  created_at: string;
  tracking_number?: string | null;
  tracking_url?: string | null;
  tracking_carrier?: string | null;
  shipping_status?: string | null;
}

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    console.log("[SUCCESS PAGE] Session ID from URL:", sessionId);
    console.log("[SUCCESS PAGE] Full URL:", window.location.href);
    console.log("[SUCCESS PAGE] Search params:", Object.fromEntries(searchParams.entries()));
    
    const fetchOrderDetails = async (retryCount = 0) => {
      if (!sessionId) {
        console.error("[SUCCESS PAGE] No session_id found in URL");
        setError("No payment session found");
        setLoading(false);
        return;
      }

      console.log(`[SUCCESS PAGE] Fetching order for session: ${sessionId} (attempt ${retryCount + 1})`);

      try {
        // Fetch order by session_id
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("session_id", sessionId)
          .maybeSingle();

        console.log("[SUCCESS PAGE] Query result:", { data, error: fetchError });

        if (fetchError) throw fetchError;

        if (data) {
          console.log("[SUCCESS PAGE] Order found:", data.order_number);
          setOrderDetails(data as OrderDetails);
          
          // Clear cart after successful order
          console.log("[SUCCESS PAGE] Clearing cart after successful order");
          cart.clear();
          
          setLoading(false);
        } else if (retryCount < 3) {
          // Order might not be created yet, retry with exponential backoff
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`[SUCCESS PAGE] Order not found, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
          setTimeout(() => fetchOrderDetails(retryCount + 1), delay);
        } else {
          console.error("[SUCCESS PAGE] Order not found after 3 retries");
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

  const { order_number, amount_total_cents, donation_cents, subtotal_cents, items, cause_name, nonprofit_name } = orderDetails;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-6 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
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
        </div>

        {/* Order Summary */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Summary
          </h2>

          {/* Items */}
          {items && items.length > 0 && (
            <div className="space-y-3 mb-6">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start py-3 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.product_name || item.name || "Product"}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                    {item.configuration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.entries(item.configuration).map(([key, value]) => `${key}: ${value}`).join(', ')}
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

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${((subtotal_cents || 0) / 100).toFixed(2)}</span>
            </div>
            
            {donation_cents > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  Donation
                </span>
                <span>${(donation_cents / 100).toFixed(2)}</span>
              </div>
            )}

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

        {/* Cause/Nonprofit Info */}
        {(cause_name || nonprofit_name) && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Supporting: {nonprofit_name || cause_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your purchase helps make a difference. Thank you for your support!
                </p>
              </div>
            </div>
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
          >
            Shop More
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
