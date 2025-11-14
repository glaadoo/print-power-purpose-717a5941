import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProductConfigurator } from "@/components/ProductConfigurator";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  currency?: string | null;
  base_cost_cents: number;
  pricing_data?: any;
  vendor_product_id?: string | null;
};

const priceFromBase = (base?: number | null) =>
  Math.max(100, Math.round((Number(base) || 0) * 1.6)); // same preview calc used elsewhere

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add, items } = useCart();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [configuredPriceCents, setConfiguredPriceCents] = useState<number | null>(null);
  const [productConfig, setProductConfig] = useState<Record<string, string>>({});

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
        .single();
      if (error) setErr(error.message);
      else setProduct(data as ProductRow);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    document.title = product ? `${product.name} - Print Power Purpose` : "Product - Print Power Purpose";
  }, [product]);

  const unitCents = configuredPriceCents ?? priceFromBase(product?.base_cost_cents);

  const unitPrice = unitCents / 100;

  function handleAddToCart() {
    if (!product) return;
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

        {/* Right: Cart */}
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
                  <h1 className="text-3xl font-serif font-semibold text-center mb-4">
                    {product.name}
                  </h1>
                  <p className="text-center text-xl font-bold mb-2">
                    Price: ${unitPrice.toFixed(2)}
                  </p>
                  {product.description && (
                    <p className="text-center opacity-90 mb-6">{product.description}</p>
                  )}

                  <div className="flex flex-col gap-6 items-center">
                    {/* Product Configuration */}
                    {product.pricing_data && (
                      <ProductConfigurator
                        productId={product.id}
                        vendorProductId={product.vendor_product_id || product.id}
                        storeCode={9}
                        pricingData={product.pricing_data}
                        onPriceChange={setConfiguredPriceCents}
                        onConfigChange={setProductConfig}
                      />
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

                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                      <button
                        onClick={handleAddToCart}
                        className="flex-1 rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90 transition-colors"
                      >
                        Add to Cart
                      </button>

                      <button
                        onClick={() =>
                          nav("/checkout", { state: { productId: product.id, qty } })
                        }
                        className="flex-1 rounded-full px-6 py-3 bg-white text-black font-semibold hover:bg-white/90 transition-colors"
                      >
                        Checkout
                      </button>
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
          </div>
        </section>
      </div>
    </div>
  );
}
