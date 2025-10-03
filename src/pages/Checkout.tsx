// src/pages/Checkout.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import { priceFromBase } from "../lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  base_cost_cents: number;
};

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cause } = useCause();
  const { push } = useToast();

  // Passed from ProductDetail via navigate("/checkout", { state: { productId, qty } })
  const { productId, qty } = (location.state as { productId?: string; qty?: number }) || {};

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [donation, setDonation] = useState<number>(0); // cents
  const [loading, setLoading] = useState(false);

  // Load product
  useEffect(() => {
    (async () => {
      if (!productId || !qty || !cause) {
        push({ title: "Missing information", body: "Please select a product and cause first." });
        navigate("/products");
        return;
      }
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error || !data) {
        push({ title: "Product not found" });
        navigate("/products");
        return;
      }
      setProduct(data as ProductRow);
    })();
  }, [productId, qty, cause, navigate, push]);

  async function handlePayment() {
    if (!cause || !product) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("checkout-session", {
        body: {
          productId: product.id,
          qty,
          causeId: cause.id,
          donationCents: donation,
        },
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

  if (!product || !cause) {
    return (
      <Layout title="Checkout">
        <GlassCard className="w-full max-w-3xl mx-auto text-center">Loading…</GlassCard>
      </Layout>
    );
  }

  const unitPrice = priceFromBase(product.base_cost_cents); // cents
  const subtotal = unitPrice * (qty || 1);
  const total = subtotal + donation;

  return (
    <Layout title="Checkout">
      <GlassCard className="w-full max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-white drop-shadow-lg">
          Review your order
        </h1>

        {/* Order summary */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between">
            <span className="text-white/90">Product</span>
            <span className="font-semibold text-white drop-shadow">{product.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/90">Quantity</span>
            <span className="font-semibold text-white drop-shadow">{qty}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/90">Unit price</span>
            <span className="font-semibold text-white drop-shadow">
              ${(unitPrice / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/90">Supporting</span>
            <span className="font-semibold text-white drop-shadow">{cause.name}</span>
          </div>
        </div>

        {/* Optional donation */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl">🐾</div>
            <div>
              <div className="font-bold text-white drop-shadow">Kenzie says:</div>
              <div className="text-white/90">
                “Want to add an optional donation for {cause.name}?”
              </div>
            </div>
          </div>

          <label htmlFor="donation" className="block text-white/90 mb-1">
            Donation (USD)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-white/80">$</span>
            <input
              id="donation"
              type="number"
              min="0"
              step="0.01"
              value={donation / 100}
              onChange={(e) =>
                setDonation(Math.max(0, Math.round(parseFloat(e.target.value || "0") * 100)))
              }
              className="input-rect bg-white/30 text-black placeholder-black/60"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-white/90">Subtotal</span>
            <span className="font-semibold text-white drop-shadow">
              ${(subtotal / 100).toFixed(2)}
            </span>
          </div>
          {donation > 0 && (
            <div className="flex justify-between">
              <span className="text-white/90">Donation</span>
              <span className="font-semibold text-white drop-shadow">
                ${(donation / 100).toFixed(2)}
              </span>
            </div>
          )}
          <div className="border-t border-white/40 my-2" />
          <div className="flex justify-between">
            <span className="font-bold text-white drop-shadow">Total</span>
            <span className="font-extrabold text-white drop-shadow">
              ${(total / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className="btn-rect w-full h-12 font-bold bg-green-600/90 hover:bg-green-600 text-white"
        >
          {loading ? "Processing…" : "Pay with Card →"}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="btn-rect w-full h-10 mt-3 font-bold text-white/90 hover:bg-white/10"
        >
          ← Back
        </button>
      </GlassCard>
    </Layout>
  );
}
