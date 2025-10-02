import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import { priceFromBase } from "../lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cause } = useCause();
  const { push } = useToast();
  
  const { productId, qty } = location.state || {};
  
  const [product, setProduct] = useState<any>(null);
  const [donation, setDonation] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !qty || !cause) {
      push({ title: "Missing information", body: "Please select a product and cause first." });
      navigate("/products");
      return;
    }
    
    supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        if (data) setProduct(data);
        else {
          push({ title: "Product not found" });
          navigate("/products");
        }
      });
  }, [productId, qty, cause, navigate, push]);

  async function handlePayment() {
    if (!cause || !product) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('checkout-session', {
        body: { 
          productId: product.id, 
          qty, 
          causeId: cause.id,
          donationCents: donation 
        }
      });

      setLoading(false);

      if (error || !data?.url) {
        push({ title: "Checkout error", body: data?.error || "Please try again." });
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      setLoading(false);
      push({ title: "Checkout error", body: "Please try again." });
    }
  }

  if (!product || !cause) return <main className="p-6 text-foreground">Loading…</main>;
  
  const unitPrice = priceFromBase(product.base_cost_cents);
  const subtotal = unitPrice * qty;
  const total = subtotal + donation;

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Review Your Order</h1>
      
      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Product</div>
            <div className="font-medium text-card-foreground">{product.name}</div>
          </div>

          <div className="flex gap-8">
            <div>
              <div className="text-sm text-muted-foreground">Quantity</div>
              <div className="font-medium text-card-foreground">{qty}</div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">Unit Price</div>
              <div className="font-medium text-card-foreground">${(unitPrice / 100).toFixed(2)}</div>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Supporting</div>
            <div className="font-medium text-card-foreground">{cause.name}</div>
          </div>
        </div>
      </div>

      <div className="bg-secondary/30 border border-border rounded-lg p-6 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-2xl">🐾</div>
          <div>
            <div className="font-medium text-foreground">Kenzie says:</div>
            <div className="text-sm text-muted-foreground">"Ready to complete your order?"</div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="donation" className="text-sm font-medium text-foreground">
            Optional Donation (USD)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <input
              id="donation"
              type="number"
              min="0"
              step="0.01"
              value={donation / 100}
              onChange={(e) => setDonation(Math.max(0, Math.round(parseFloat(e.target.value || '0') * 100)))}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Add an extra donation to support {cause.name}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-card-foreground">${(subtotal / 100).toFixed(2)}</span>
        </div>
        {donation > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">Donation</span>
            <span className="text-card-foreground">${(donation / 100).toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-border my-3" />
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-bold text-xl text-foreground">${(total / 100).toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50 transition-opacity"
      >
        {loading ? "Processing..." : "Pay with Card →"}
      </button>

      <button
        onClick={() => navigate(-1)}
        className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back
      </button>
    </main>
  );
}
