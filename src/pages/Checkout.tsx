// src/pages/Checkout.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import { useCart } from "../context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { normalizeDonationCents } from "@/lib/donation-utils";
import { withRetry } from "@/lib/api-retry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ArtworkUpload from "@/components/ArtworkUpload";

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
      return { cause: null as any, nonprofit: null as any };
    }
  })();

  // Merge 1) location.state, 2) URL query, 3) localStorage, 4) CauseContext (last resort)
  const merged = useMemo(() => {
    const st = (location?.state ?? {}) as any;
    const q = getFromQuery();
    const ls = getFromLocalStorage();
    const causeIdFromCtx =
      (causeCtx as any)?.cause?.id || 
      (causeCtx as any)?.cause?.causeId || 
      (causeCtx as any)?.nonprofit?.id;

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

  // Legal consent state
  const [legalConsent, setLegalConsent] = useState(false);
  // Detect when the page is stuck in a loading state and surface an actionable error
  const [stalled, setStalled] = useState(false);
  
  // Artwork upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingForItemId, setUploadingForItemId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);


  // Fetch product & persist merged selection (refresh-proof)
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
    
    // Only use cause if explicitly provided by user
    if (causeId) {
      setSelectedCauseId(String(causeId));
      // Check if it's a nonprofit or a cause and fetch the name accordingly
      (async () => {
        // Try fetching from causes first
        const { data: causeData, error: causeError } = await supabase
          .from("causes")
          .select("name")
          .eq("id", causeId)
          .maybeSingle();
        
        if (!causeError && causeData?.name) {
          setSelectedCauseName(causeData.name);
        } else {
          // If not found in causes, try nonprofits
          const { data: nonprofitData, error: nonprofitError } = await supabase
            .from("nonprofits")
            .select("name")
            .eq("id", causeId)
            .maybeSingle();
          
          if (!nonprofitError && nonprofitData?.name) {
            setSelectedCauseName(nonprofitData.name);
          } else if (nonprofitError) {
            console.error("Error fetching nonprofit:", nonprofitError);
          }
        }
      })();
    } else {
      // Clear cause selection if none provided
      setSelectedCauseId(null);
      setSelectedCauseName(null);
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
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching product:", error);
            setError("Error loading product. Please try again.");
            return;
          }
          if (!data) {
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

    // Build cart items - use cart if available, otherwise use single product
    const checkoutItems = cartItems.length > 0 
      ? cartItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          name: item.name,
          priceCents: item.priceCents,
        }))
      : product 
        ? [{
            id: product.id,
            quantity: merged.qty || 1,
            name: product.name,
            priceCents: product.priceCents || priceFromBase(product.base_cost_cents),
          }]
        : [];

    // Don't proceed if no items
    if (checkoutItems.length === 0) {
      toast.push({ title: "Cart is empty - please add items first" });
      setLoading(false);
      return;
    }

    const payload = {
      cart: {
        items: checkoutItems,
      },
      nonprofitId: (causeCtx as any)?.nonprofit?.id || null,
      donationCents: normalizedDonation,
    };

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://wgohndthjgeqamfuldov.supabase.co"}/functions/v1/checkout-session-v2`;
    const supaAnon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2huZHRoamdlcWFtZnVsZG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDQ1MTYsImV4cCI6MjA3NDc4MDUxNn0.cb9tO9fH93WRlLclJwhhmY03Hck9iyZF6GYXjbYjibw";

    try {
      // Use retry logic for API call
      const response = await withRetry(async () => {
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
          console.error("[checkout-session-v2 FAILED]", r.status, txt);
          const error: any = new Error(txt || `HTTP ${r.status}`);
          error.status = r.status;
          throw error;
        }

        const data = JSON.parse(txt || "{}");
        if (!data.url) {
          console.error("[checkout-session-v2 MISSING URL]", txt);
          throw new Error("Stripe did not return a URL");
        }

        return data;
      });

      console.log("Checkout created:", response);
      window.location.href = response.url; // Redirect to Stripe Hosted Checkout
    } catch (e: any) {
      console.error(e);
      alert(`Checkout error. ${e?.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  }

  // Surface an error if prerequisites aren't met after a short delay
  useEffect(() => {
    const needsPrereqs = (cartItems.length === 0 && !product) || !(selectedCauseId || merged.causeId);
    if (!needsPrereqs) {
      setStalled(false);
      return;
    }
    setStalled(true);
    const t = setTimeout(() => {
      if (!(selectedCauseId || merged.causeId)) {
        setError("Please select a cause before checkout.");
      } else if (cartItems.length === 0 && !product) {
        setError("Missing product. Please add an item to your cart.");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [cartItems.length, product, selectedCauseId, merged.causeId]);

  // ---- UI ----
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <a
              href="/"
              className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase text-blue-600"
              aria-label="Print Power Purpose Home"
            >
              PRINT&nbsp;POWER&nbsp;PURPOSE
            </a>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 md:p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                className="rounded-full px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                onClick={() => navigate(error?.toLowerCase().includes("product") ? "/products" : "/causes")}
              >
                {error?.toLowerCase().includes("product") ? "Browse Products" : "Pick a Cause"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((cartItems.length === 0 && !product) || !(selectedCauseId || merged.causeId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <a
              href="/"
              className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase text-blue-600"
              aria-label="Print Power Purpose Home"
            >
              PRINT&nbsp;POWER&nbsp;PURPOSE
            </a>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 md:p-8 text-center">
            <p className="text-gray-600">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals from cart items
  const subtotal = cartItems.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
  const total = subtotal + donation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Back */}
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Center: Brand */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <a
              href="/"
              className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase text-blue-600"
              aria-label="Print Power Purpose Home"
            >
              PRINT&nbsp;POWER&nbsp;PURPOSE
            </a>
          </div>

          {/* Right: Donate */}
          <button
            onClick={continueToCheckout}
            disabled={loading || !legalConsent}
            className="flex items-center gap-2 rounded-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            aria-label="Donate"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">{loading ? "Processing..." : "Pay"}</span>
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-blue-600 text-center mb-8">
            Review Your Order
          </h1>

          {/* Order summary */}
          <div className="space-y-4 mb-6">
            {cartItems.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex gap-4">
                  {/* Product Image */}
                  {item.imageUrl && (
                    <div className="w-20 h-20 flex-shrink-0">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover rounded-md border border-gray-200"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 space-y-2">
                    {/* Product Name & Price */}
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <span className="font-bold text-blue-600">
                        ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Configuration Details */}
                    {item.configuration && Object.keys(item.configuration).length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Configuration: </span>
                        {Object.entries(item.configuration).map(([key, value], idx) => (
                          <span key={key}>
                            {key}: {String(value)}
                            {idx < Object.keys(item.configuration!).length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Quantity & Unit Price */}
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Quantity: <span className="font-semibold">{item.quantity}</span></span>
                      <span>Unit Price: <span className="font-semibold">${(item.priceCents / 100).toFixed(2)}</span></span>
                    </div>
                    
                    {/* Artwork Preview */}
                    {item.artworkUrl && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-700">
                              Artwork: {item.artworkFileName || 'Uploaded'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // Open artwork in new tab for preview
                                window.open(item.artworkUrl!, '_blank');
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                setUploadingForItemId(item.id);
                                setConfirmDialogOpen(true);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                            >
                              Upload New
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Supporting Cause/Nonprofit */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex justify-between mb-2">
                <span className="text-gray-700 font-medium">Supporting</span>
                <span className="font-semibold text-blue-700">
                  {selectedCauseName || causeCtx?.cause?.name || "General Fund"}
                </span>
              </div>
              {causeCtx?.nonprofit && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Nonprofit</span>
                  <span className="text-gray-900">
                    {causeCtx.nonprofit.name}
                    {causeCtx.nonprofit.ein && (
                      <span className="text-gray-500 ml-2">(EIN: {causeCtx.nonprofit.ein})</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Optional donation */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <div className="mb-4">
              <p className="text-lg font-semibold text-blue-600 mb-2">
                Add an Optional Donation
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Help us support more causes with a small donation.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold text-gray-900">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(donation / 100).toFixed(2)}
                  onChange={(e) => {
                    const usd = parseFloat(e.target.value || "0");
                    setDonation(Math.max(0, Math.round(usd * 100)));
                  }}
                  className="w-full p-3 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <div className="flex justify-between text-xl font-bold mb-2 text-gray-900">
              <span>Subtotal</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            {donation > 0 && (
              <div className="flex justify-between text-lg text-gray-600 mb-2">
                <span>Donation</span>
                <span>${(donation / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-bold text-blue-600">
              <span>Total</span>
              <span>${(total / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Legal Consent Checkbox */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={legalConsent}
                onChange={(e) => setLegalConsent(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I agree to the{" "}
                <a href="/policies/terms" className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">
                  Terms of Use
                </a>{" "}
                and{" "}
                <a href="/policies/privacy" className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>

          {/* Pay button */}
          <button
            onClick={continueToCheckout}
            disabled={loading || !legalConsent}
            className="w-full py-4 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing..." : "Continue to Payment"}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Artwork?</DialogTitle>
            <DialogDescription>
              Are you sure you want to replace the current artwork? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {/* Current Artwork Preview */}
          {uploadingForItemId && (() => {
            const currentItem = cartItems.find(i => i.id === uploadingForItemId);
            return currentItem?.artworkUrl ? (
              <div className="my-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Current Artwork:</p>
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <img 
                    src={currentItem.artworkUrl} 
                    alt="Current artwork"
                    className="w-full h-40 object-contain rounded"
                  />
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    {currentItem.artworkFileName || 'Uploaded artwork'}
                  </p>
                </div>
              </div>
            ) : null;
          })()}
          
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setUploadingForItemId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmDialogOpen(false);
                setUploadDialogOpen(true);
              }}
            >
              Yes, Replace
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Artwork Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Artwork</DialogTitle>
            <DialogDescription>
              Replace the artwork for this product. The new file will be used for production.
            </DialogDescription>
          </DialogHeader>
          {uploadingForItemId && (
            <ArtworkUpload
              productId={uploadingForItemId}
              productName={cartItems.find(i => i.id === uploadingForItemId)?.name || "Product"}
              onUploadComplete={(fileUrl, fileName) => {
                // Update cart item with new artwork
                const updatedItems = cartItems.map(item => 
                  item.id === uploadingForItemId 
                    ? { ...item, artworkUrl: fileUrl, artworkFileName: fileName }
                    : item
                );
                
                // Update localStorage cart
                try {
                  localStorage.setItem("ppp:cart", JSON.stringify({ items: updatedItems }));
                  
                  // Show success toast
                  toast.push({
                    title: "Artwork uploaded successfully!",
                    body: `${fileName} has been added to your order.`,
                  });
                  
                  // Force refresh by triggering a state update
                  setTimeout(() => {
                    window.location.reload();
                  }, 1500); // Delay reload to show toast
                  
                } catch (e) {
                  console.error("Failed to update cart:", e);
                  toast.push({
                    title: "Upload failed",
                    body: "Could not save artwork to your order. Please try again.",
                  });
                }
                
                setUploadDialogOpen(false);
                setUploadingForItemId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
