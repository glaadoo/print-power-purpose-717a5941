import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart } from "lucide-react";
import ProductConfiguratorLoader from "@/components/ProductConfiguratorLoader";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import ProductReviews from "@/components/ProductReviews";
import ReviewForm from "@/components/ReviewForm";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  currency?: string | null;
  base_cost_cents: number;
  pricing_data?: any;
  vendor_product_id?: string | null;
  vendor?: string | null;
  markup_fixed_cents?: number | null;
  markup_percent?: number | null;
};

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add, items } = useCart();
  const { count: favoritesCount } = useFavorites();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [configuredPriceCents, setConfiguredPriceCents] = useState<number | null>(null);
  const [productConfig, setProductConfig] = useState<Record<string, string>>({});
  const [packageInfo, setPackageInfo] = useState<any>(null);
  const [imageError, setImageError] = useState(false);
  const [reviewsKey, setReviewsKey] = useState(0);

  // Fetch product by ID from Supabase
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        setErr(error.message);
      } else if (!data) {
        setErr("Product not found");
      } else {
        setProduct(data as ProductRow);
        
        // Track as recently viewed when product loads
        addRecentlyViewed({
          id: data.id,
          name: data.name,
          image_url: data.image_url,
          category: data.category
        });
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    document.title = product ? `${product.name} - Print Power Purpose` : "Product - Print Power Purpose";
  }, [product]);

  // Check if product requires configuration
  const requiresConfiguration = product?.pricing_data && 
    Array.isArray(product.pricing_data) && 
    product.pricing_data.length > 0;
  
  const isConfigured = configuredPriceCents !== null;
  const canAddToCart = !requiresConfiguration || isConfigured;

  // For Sinalite products with pricing_data, price ONLY comes from API after configuration
  let unitCents: number;
  if (configuredPriceCents !== null) {
    unitCents = configuredPriceCents;
  } else if (product && product.vendor === "sinalite" && product.pricing_data) {
    // Sinalite products require configuration - no default price
    unitCents = 0;
  } else if (product) {
    // Apply product-level markup if set
    const markup_fixed = product.markup_fixed_cents ?? 0;
    const markup_percent = product.markup_percent ?? 0;
    const base = product.base_cost_cents;
    const markup_amount = Math.round(base * (markup_percent / 100)) + markup_fixed;
    unitCents = base + markup_amount;
  } else {
    unitCents = 0;
  }
  const unitPrice = unitCents / 100;

  function handleAddToCart() {
    if (!product || !canAddToCart) return;
    add(
      {
        id: product.id,
        name: product.name,
        priceCents: unitCents,
        imageUrl: product.image_url,
        currency: product.currency || "USD",
      },
      Math.max(1, Number(qty))
    );
  }

  return (
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10 relative">
        {/* Left: Back button */}
        <Button
          onClick={() => nav(-1)}
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

        {/* Right: Wishlist and Cart */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => nav("/favorites")}
            className="rounded-full border-white/50 bg-white/10 text-white hover:bg-white/20 relative"
          >
            <Heart className="w-4 h-4" />
            {favoritesCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </Button>
          
          <button
            onClick={() => nav("/cart")}
            className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30 relative"
            aria-label="View cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 2L7.17 4H3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-4.17L15 2H9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 7v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">Cart</span>
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {items.length}
              </span>
            )}
          </button>
        </div>
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
              {loading && <p className="text-center">Loading product…</p>}
              
              {err && (
                <p className="text-center text-red-400">{err || "Product not found"}</p>
              )}

              {!loading && !err && product && (
                <>
                  {/* Product Image */}
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-6">
                    {product.image_url && !imageError ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(`Failed to load image for product "${product.name}":`, product.image_url);
                          setImageError(true);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <div className="text-center p-6">
                          <svg className="w-20 h-20 mx-auto text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-white/40 text-sm mt-3">No image available</p>
                        </div>
                      </div>
                    )}
                  </div>

                   <h1 className="text-3xl font-serif font-semibold text-center mb-4">
                    {product.name}
                  </h1>
                  {unitPrice > 0 ? (
                    <p className="text-center text-xl font-bold mb-2">
                      Price: ${unitPrice.toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-center text-sm text-yellow-300 mb-2">
                      Configure product to see pricing
                    </p>
                  )}
                  {product.description && (
                    <p className="text-center opacity-90 mb-6">{product.description}</p>
                  )}

                  <div className="flex flex-col gap-6 items-center">
                    {/* Product Configuration */}
                    {(product.pricing_data || product.vendor === 'sinalite') && (
                      <ProductConfiguratorLoader
                        productId={product.id}
                        onPriceChange={setConfiguredPriceCents}
                        onConfigChange={setProductConfig}
                        onQuantityOptionsChange={(opts) => {
                          // Optional: handle quantity options
                        }}
                      />
                    )}

                    {/* Package Information */}
                    {packageInfo && (
                      <div className="mt-4 p-4 bg-background/60 backdrop-blur-sm rounded-lg border border-border/40 space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Package Information</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          {packageInfo["total weight"] && (
                            <div>
                              <span className="font-medium">Total Weight:</span> {packageInfo["total weight"]} lbs
                            </div>
                          )}
                          {packageInfo["box size"] && (
                            <div>
                              <span className="font-medium">Box Size:</span> {packageInfo["box size"]}"
                            </div>
                          )}
                          {packageInfo["Units Per Box"] && (
                            <div>
                              <span className="font-medium">Units Per Box:</span> {packageInfo["Units Per Box"]}
                            </div>
                          )}
                          {packageInfo["number of boxes"] && (
                            <div>
                              <span className="font-medium">Number of Boxes:</span> {packageInfo["number of boxes"]}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="w-full max-w-xs">
                      <label className="block text-sm font-medium mb-2 text-center">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                        className="w-full rounded-xl bg-white/90 text-black px-4 py-2 text-center outline-none"
                      />
                    </div>

                    {requiresConfiguration && !isConfigured && (
                      <p className="text-sm text-yellow-300 mb-3">
                        Please select product options above before adding to cart
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                      <Button
                        onClick={handleAddToCart}
                        disabled={!canAddToCart}
                        className="flex-1 rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add to Cart
                      </Button>

                      <Button
                        onClick={() =>
                          nav("/checkout", { state: { productId: product.id, qty } })
                        }
                        disabled={!canAddToCart}
                        className="flex-1 rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Checkout
                      </Button>
                    </div>

                    <button
                      onClick={() => nav("/products")}
                      className="mt-2 text-sm opacity-80 hover:opacity-100 underline"
                    >
                      ← Back to products
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Reviews Section */}
            {!loading && !err && product && (
              <div className="relative w-full max-w-2xl mx-auto mt-8">
                <div className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8">
                  <h2 className="text-2xl font-serif font-semibold mb-6">Customer Reviews</h2>
                  
                  <div className="space-y-8">
                    <ReviewForm
                      productId={product.id}
                      onReviewSubmitted={() => setReviewsKey((k) => k + 1)}
                    />
                    <ProductReviews key={reviewsKey} productId={product.id} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
