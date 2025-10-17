// src/pages/Checkout.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FloatingCheckoutBar from "../components/FloatingCheckoutBar";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import { supabase } from "@/lib/supabase";
import VideoBackground from "@/components/VideoBackground";

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

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://wgohndthjgeqamfuldov.supabase.co"}/functions/v1/checkout-session`;
    const supaAnon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2huZHRoamdlcWFtZnVsZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDQ1MTYsImV4cCI6MjA3NDc4MDUxNn0.cb9tO9fH93WRlLclJwhhmY03Hck9iyZF6GYXjbYjibw";

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

  if (!product || !(selectedCauseId || merged.causeId)) {
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

  const qty = Number(merged.qty || 1);
  const unitPrice =
    Number(product.priceCents || 0) > 0
      ? Math.max(50, Math.round(Number(product.priceCents)))
      : Math.max(50, priceFromBase(product.base_cost_cents));
  const subtotal = unitPrice * qty;
  const total = subtotal + donation;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        {/* Left: Home */}
        <a
          href="/"
          className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          aria-label="Home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="hidden sm:inline">Home</span>
        </a>

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

          <div className="relative w-full max-w-2xl mx-auto mb-32">
            <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8">
              <h1 className="text-3xl font-serif font-semibold text-center mb-8">
                Review Your Order
              </h1>

              {/* Order summary */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="opacity-90">Product</span>
                  <span className="font-semibold">{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-90">Quantity</span>
                  <span className="font-semibold">{qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-90">Unit price</span>
                  <span className="font-semibold">
                    ${(unitPrice / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-90">Supporting</span>
                  <span className="font-semibold">
                    {selectedCauseName || causeCtx?.cause?.name || merged.causeId}
                  </span>
                </div>
              </div>

              {/* Optional donation */}
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">🐾</div>
                  <div>
                    <div className="font-bold">Kenzie says:</div>
                    <div className="opacity-90">
                      "Want to add an optional donation for {causeCtx?.cause?.name || "this cause"}?"
                    </div>
                  </div>
                </div>

                <label htmlFor="donation" className="block opacity-90 mb-2">
                  Donation (USD)
                </label>
                <div className="flex items-center gap-2">
                  <span className="opacity-80">$</span>
                  <input
                    id="donation"
                    type="number"
                    min="0"
                    step="0.01"
                    value={(donation / 100).toString()}
                    onChange={(e) =>
                      setDonation(Math.max(0, Math.round(parseFloat(e.target.value || "0") * 100)))
                    }
                    className="flex-1 rounded-xl bg-white/90 text-black px-4 py-2 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Floating Checkout Summary Bar */}
          <FloatingCheckoutBar
            productName={product.name}
            quantity={qty}
            subtotalCents={subtotal}
            donationCents={donation}
          />
        </section>
      </div>
    </div>
  );
}

