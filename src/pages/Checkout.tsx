// src/pages/Checkout.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import { useCart } from "../context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { normalizeDonationCents } from "@/lib/donation-utils";
import { withRetry } from "@/lib/api-retry";

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
  const { items: cartItems } = useCart();

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


  // Fetch product & persist merged selection (refresh-proof). If no cause provided, auto-pick first.
  useEffect(() => {
    const { productId, qty, causeId, donationUsd } = merged;

    // Persist latest selection
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ productId, qty, causeId, donationUsd }));
    } catch {}

    // Only require productId if we don't have cart items
    if (!productId && cartItems.length === 0) {
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
      // Fetch the cause name for the selected causeId
      (async () => {
        const { data, error } = await supabase
          .from("causes")
          .select("name")
          .eq("id", causeId)
          .single();
        if (!error && data?.name) {
          setSelectedCauseName(data.name);
        }
      })();
    }
    if (!qty || qty < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    // Only fetch product if we have a productId and no cart items
    if (productId && cartItems.length === 0) {
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
    }
  }, [merged]);

  // Create Stripe Checkout with retry logic
  async function continueToCheckout() {
    const causeIdForCheckout = selectedCauseId || merged.causeId;
    if (!causeIdForCheckout) return;
    
    // If we have cart items, use those; otherwise fall back to single product
    if (cartItems.length === 0 && !product) return;
    
    setLoading(true);

    // Normalize donation amount
    const normalizedDonation = normalizeDonationCents(donation);

    const payload = {
      items: cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        name: item.name,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl || undefined,
      })),
      causeId: causeIdForCheckout,
      donationCents: normalizedDonation,
    };

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://wgohndthjgeqamfuldov.supabase.co"}/functions/v1/checkout-session`;
    const supaAnon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2huZHRoamdlcWFtZnVsZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDQ1MTYsImV4cCI6MjA3NDc4MDUxNn0.cb9tO9fH93WRlLclJwhhmY03Hck9iyZF6GYXjbYjibw";

    try {
      // Use retry logic for API call
      const { url } = await withRetry(async () => {
        const r = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supaAnon,
            "Authorization": `Bearer ${supaAnon}`,
          },
          body: JSON.stringify(payload),
        });

        const txt = await r.text();
        if (!r.ok) {
          console.error("[checkout-session FAILED]", r.status, txt);
          const error: any = new Error(txt || `HTTP ${r.status}`);
          error.status = r.status;
          throw error;
        }

        const data = JSON.parse(txt || "{}");
        if (!data.url) {
          console.error("[checkout-session MISSING URL]", txt);
          throw new Error("Stripe did not return a URL");
        }

        return data;
      });

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
      <div className="fixed inset-0 text-white">
        <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
          <a
            href="/"
            className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
            aria-label="Print Power Purpose Home"
          >
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
        </header>

        <div className="h-full overflow-y-auto scroll-smooth pt-16">
          <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
            <VideoBackground
              srcMp4="/media/hero.mp4"
              srcWebm="/media/hero.webm"
              poster="/media/hero-poster.jpg"
              overlay={<div className="absolute inset-0 bg-black/50" />}
            />

            <div className="relative w-full max-w-2xl mx-auto">
              <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8 text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    className="rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90"
                    onClick={() => navigate("/causes")}
                  >
                    Pick a Cause
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if ((cartItems.length === 0 && !product) || !(selectedCauseId || merged.causeId)) {
    return (
      <div className="fixed inset-0 text-white">
        <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
          <a
            href="/"
            className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
            aria-label="Print Power Purpose Home"
          >
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
        </header>

        <div className="h-full overflow-y-auto scroll-smooth pt-16">
          <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
            <VideoBackground
              srcMp4="/media/hero.mp4"
              srcWebm="/media/hero.webm"
              poster="/media/hero-poster.jpg"
              overlay={<div className="absolute inset-0 bg-black/50" />}
            />

            <div className="relative w-full max-w-2xl mx-auto">
              <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8 text-center">
                Loading…
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Calculate totals from cart items
  const subtotal = cartItems.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
  const total = subtotal + donation;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        {/* Left: Back */}
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Center: Brand */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <a
            href="/"
            className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
            aria-label="Print Power Purpose Home"
          >
            PRINT&nbsp;POWER&nbsp;PURPOSE
          </a>
        </div>

        {/* Right: Donate */}
        <button
          onClick={continueToCheckout}
          disabled={loading}
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Donate"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">{loading ? "Processing..." : "Donate"}</span>
        </button>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-2xl mx-auto">
            <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8">
              <h1 className="text-3xl font-serif font-semibold text-center mb-8">
                Review Your Order
              </h1>

              {/* Order summary */}
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="border-b border-white/20 pb-4">
                    <div className="flex justify-between mb-2">
                      <span className="opacity-90">Product</span>
                      <span className="font-semibold">{item.name}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="opacity-90">Quantity</span>
                      <span className="font-semibold">{item.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-90">Total</span>
                      <span className="font-semibold">
                        ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <span className="opacity-90">Supporting</span>
                  <span className="font-semibold">
                    {selectedCauseName || causeCtx?.cause?.name || merged.causeId}
                  </span>
                </div>
              </div>

              {/* Optional donation */}
              <div className="border-t border-white/20 pt-6 mb-6">
                <div className="mb-4">
                  <p className="text-lg font-medium mb-2">
                    Before completing your payment, would you like to add an additional donation to support your selected cause?
                  </p>
                  <p className="text-sm opacity-75 italic">
                    (Optional - Leave empty to proceed without additional donation)
                  </p>
                </div>

                <label htmlFor="donation" className="block font-medium mb-2">
                  Additional Donation Amount (USD) - Optional
                </label>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">$</span>
                  <input
                    id="donation"
                    type="number"
                    min="0"
                    step="0.01"
                    value={donation === 0 ? "" : (donation / 100).toFixed(2)}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setDonation(value === "" ? 0 : Math.max(0, Math.round(parseFloat(value) * 100)));
                    }}
                    className="flex-1 rounded-xl bg-white/90 text-black px-4 py-3 outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="0.00 (optional)"
                  />
                </div>

                {/* Total breakdown */}
                <div className="bg-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-90">Subtotal</span>
                    <span className="font-medium">${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  {donation > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="opacity-90">Donation</span>
                      <span className="font-medium text-green-300">${(donation / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-white/20 text-lg font-bold">
                    <span>Total</span>
                    <span>${(total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Continue button */}
              <button
                onClick={continueToCheckout}
                disabled={loading}
                className="w-full bg-white/20 text-white hover:bg-white/30 border border-white/50 backdrop-blur-sm shadow-lg rounded-2xl px-6 py-4 text-base font-semibold transition-all disabled:opacity-50 mt-6"
              >
                {loading ? "Processing..." : "Continue to Payment"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

