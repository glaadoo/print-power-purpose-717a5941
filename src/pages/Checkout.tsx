// src/pages/Checkout.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import { supabase } from "@/integrations/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  priceCents?: number | null;
  base_cost_cents?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
};

const priceFromBase = (base?: number | null) =>
  Math.max(100, Math.round((Number(base) || 0) * 1.6)); // simple markup fallback (>= $1.00)

const LS_KEY = "ppp:checkout"; // { productId, qty, causeId, donationUsd }

function getFromQuery() {
  const sp = new URLSearchParams(window.location.search);
  const productId = sp.get("productId") || undefined;
  const qty = sp.get("qty") ? Number(sp.get("qty")) : undefined;
  const causeId = sp.get("causeId") || undefined;
  const donationUsd = sp.get("donationUsd") ? Number(sp.get("donationUsd")) : undefined;
  return { productId, qty, causeId, donationUsd };
}

function getFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation() as any;

  // Optional hooks (guarded)
  const toast = (() => {
    try {
      return useToast();
    } catch {
      return { push: (_: any) => {} } as { push: (x: any) => void };
    }
  })();
  const causeCtx = (() => {
    try {
      return useCause();
    } catch {
      return { cause: null as any };
    }
  })();

  // Merge 1) location.state, 2) URL query, 3) localStorage, 4) CauseContext (last resort)
  const merged = useMemo(() => {
    const st = (location?.state ?? {}) as any;
    const q = getFromQuery();
    const ls = getFromLocalStorage();
    const causeIdFromCtx =
      (causeCtx as any)?.cause?.id || (causeCtx as any)?.cause?.causeId;

    return {
      productId: st.productId ?? q.productId ?? (ls as any).productId,
      qty: Number(st.qty ?? q.qty ?? (ls as any).qty ?? 1),
      causeId: st.causeId ?? q.causeId ?? (ls as any).causeId ?? causeIdFromCtx,
      donationUsd: Number(
        String(st.donationUsd ?? q.donationUsd ?? (ls as any).donationUsd ?? 0).replace(",", ".")
      ),
    };
  }, [location, causeCtx]);

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCauseId, setSelectedCauseId] = useState<string | null>(null);
  const [selectedCauseName, setSelectedCauseName] = useState<string | null>(null);

  // store donation locally in cents for the input
  const [donation, setDonation] = useState<number>(
    Math.max(0, Math.round(Number(merged.donationUsd || 0) * 100))
  );

  // Show toast if Stripe sent back ?payment=cancelled
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "cancelled") {
      toast.push?.({
        title: "Payment cancelled",
        body: "Your payment was not completed. Please try again.",
      });
    }
  }, [location.search, toast]);

  // Fetch product & persist merged selection (refresh-proof). If no cause provided, auto-pick first.
  useEffect(() => {
    const { productId, qty, causeId, donationUsd } = merged;

    // Persist latest selection
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ productId, qty, causeId, donationUsd }));
    } catch {}

    if (!productId) {
      setError("Missing product. Please select a product first.");
      return;
    }
    // If causeId missing, auto-select the first available cause
    if (!causeId) {
      (async () => {
        const { data, error } = await supabase
          .from("causes")
          .select("id, name")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        if (!error && data?.id) {
          setSelectedCauseId(data.id);
          setSelectedCauseName(data.name ?? null);
          try {
            localStorage.setItem(
              LS_KEY,
              JSON.stringify({ productId, qty, causeId: data.id, donationUsd })
            );
          } catch {}
        } else {
          setError("No causes available. Please add a cause.");
        }
      })();
    } else {
      setSelectedCauseId(String(causeId));
    }
    if (!qty || qty < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError("Product not found");
          return;
        }
        setProduct(data as ProductRow);
      });
  }, [merged]);

  // Create Stripe Checkout by calling your Edge Function directly (with required headers)
  async function continueToCheckout() {
    if (!product) return;
    const causeIdForCheckout = selectedCauseId || merged.causeId;
    if (!causeIdForCheckout) return;
    setLoading(true);

    // Final integer unit price in cents (Stripe requires >= 50)
    const unitAmountCents =
      Number(product.priceCents || 0) > 0
        ? Math.max(50, Math.round(Number(product.priceCents)))
        : Math.max(50, priceFromBase(product.base_cost_cents));

     const payload = {
       productId: product.id,
       qty: Number(merged.qty || 1),
       causeId: causeIdForCheckout,
       donationCents: donation,
     };

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checkout-session`;
    const supaAnon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

    try {
      const r = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // REQUIRED for Supabase Edge Functions that expect JWT
          "apikey": supaAnon,
          "Authorization": `Bearer ${supaAnon}`,
        },
        body: JSON.stringify(payload),
      });

      const txt = await r.text(); // read raw so we can surface errors
      if (!r.ok) {
        console.error("[checkout-session FAILED]", r.status, txt);
        throw new Error(txt || `HTTP ${r.status}`);
      }

      const { url } = JSON.parse(txt || "{}");
      if (!url) {
        console.error("[checkout-session MISSING URL]", txt);
        throw new Error("Stripe did not return a URL");
      }

      window.location.href = url; // Redirect to Stripe Hosted Checkout
    } catch (e: any) {
      console.error(e);
      alert(`Checkout error. ${e?.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  }

  // ---- UI ----
  if (error) {
    return (
      <Layout title="Checkout">
        <GlassCard className="w-full max-w-3xl mx-auto text-center">
          <p className="text-red-600">{error}</p>
          <div className="text-center mt-4 flex gap-3 justify-center">
            <button className="btn-rect" onClick={() => navigate("/products")}>
              Back to products
            </button>
            <button className="btn-rect" onClick={() => navigate("/causes")}>
              Pick a cause
            </button>
          </div>
        </GlassCard>
      </Layout>
    );
  }

  if (!product || !(selectedCauseId || merged.causeId)) {
    return (
      <Layout title="Checkout">
        <GlassCard className="w-full max-w-3xl mx-auto text-center">Loading…</GlassCard>
      </Layout>
    );
  }

  const qty = Number(merged.qty || 1);
  const unitPrice =
    Number(product.priceCents || 0) > 0
      ? Math.max(50, Math.round(Number(product.priceCents)))
      : Math.max(50, priceFromBase(product.base_cost_cents));
  const subtotal = unitPrice * qty;
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
            <span className="font-semibold text-white drop-shadow">
              {selectedCauseName || causeCtx?.cause?.name || merged.causeId}
            </span>
          </div>
        </div>

        {/* Optional donation */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl">🐾</div>
            <div>
              <div className="font-bold text-white drop-shadow">Kenzie says:</div>
              <div className="text-white/90">
                “Want to add an optional donation for {causeCtx?.cause?.name || "this cause"}?”
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
              value={(donation / 100).toString()}
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
          onClick={continueToCheckout}
          disabled={loading}
          className="btn-rect w-full h-12 font-bold bg-green-600/90 hover:bg-green-600 text-white"
        >
          {loading ? "Processing…" : "Continue to checkout →"}
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

