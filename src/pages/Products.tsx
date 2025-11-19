import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import VideoBackground from "@/components/VideoBackground";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { withRetry } from "@/lib/api-retry";
import { computeGlobalPricing, type PricingSettings } from "@/lib/global-pricing";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  base_cost_cents: number;
  price_override_cents?: number | null;
  image_url?: string | null;
  category?: string | null;
  pricing_data?: any;
  vendor?: string | null;
};


export default function Products() {
  const navigate = useNavigate();
  const { add, items, count, totalCents } = useCart();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [configuredPrices, setConfiguredPrices] = useState<Record<string, number>>({});
  const [productConfigs, setProductConfigs] = useState<Record<string, Record<string, string>>>({});
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setErr(null);
    try {
      // Fetch pricing settings and products in parallel
      const [settingsResult, productsResult] = await Promise.all([
        withRetry(
          async () => {
            const { data, error } = await supabase
              .from("pricing_settings")
              .select("*")
              .eq("vendor", "sinalite")
              .maybeSingle();
            
            if (error) throw error;
            
            // Return NO markup if none configured - show base price only
            return data || {
              vendor: "sinalite",
              markup_mode: "fixed",
              markup_fixed_cents: 0,
              markup_percent: 0,
              nonprofit_share_mode: "fixed",
              nonprofit_fixed_cents: 0,
              nonprofit_percent_of_markup: 0,
              currency: "USD"
            };
          },
          { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 5000 }
        ),
        withRetry(
          async () => {
            const { data, error } = await supabase
              .from("products")
              .select("id, name, base_cost_cents, price_override_cents, image_url, category, vendor, markup_fixed_cents, markup_percent, is_active, pricing_data, vendor_product_id")
              .eq("is_active", true)
              .order("category", { ascending: true })
              .order("name", { ascending: true })
              .limit(200);
            
            if (error) throw error;
            return data ?? [];
          },
          { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 5000 }
        )
      ]);
      
      setPricingSettings(settingsResult as PricingSettings);
      setRows(productsResult);
    } catch (e: any) {
      console.error('[Products] Failed to load products:', e);
      setErr(e?.message || "Failed to load products. Please try again.");
      toast.error("Failed to load products", {
        description: "Please check your connection and try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Sync quantities with cart items
  useEffect(() => {
    const cartQuantities: Record<string, number> = {};
    items.forEach(item => {
      cartQuantities[item.id] = item.quantity;
    });
    setQuantities(cartQuantities);
  }, [items]);

  useEffect(() => {
    document.title = "Products - Print Power Purpose";
    fetchProducts();
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  const handleAddToCart = (product: ProductRow) => {
    const requiresConfiguration = product.pricing_data && 
      Array.isArray(product.pricing_data) && 
      product.pricing_data.length > 0;
    
    const isConfigured = !!configuredPrices[product.id];

    // Only enforce configuration if product actually requires it
    if (requiresConfiguration && !isConfigured) {
      toast.error("Please configure product options first");
      return;
    }

    const qty = quantities[product.id] || 1;
    
    // Use configured price if available, otherwise calculate from base + markup
    let unitCents: number;
    if (configuredPrices[product.id]) {
      unitCents = configuredPrices[product.id];
    } else {
      // Calculate price with markup for non-configured products
      if (product.vendor === "sinalite" && pricingSettings) {
        const pricing = computeGlobalPricing({
          vendor: "sinalite",
          base_cost_cents: product.base_cost_cents || 0,
          settings: pricingSettings
        });
        unitCents = pricing.final_price_per_unit_cents;
      } else {
        unitCents = product.base_cost_cents || 100;
      }
    }

    if (!unitCents || unitCents <= 0) {
      toast.error("Price unavailable. Please try again.");
      return;
    }

    add(
      {
        id: product.id,
        name: product.name,
        priceCents: unitCents,
        imageUrl: product.image_url,
        currency: "USD",
      },
      qty
    );

    toast.success(`Added ${qty} ${product.name} to cart`);
  };

  const handlePriceChange = (productId: string, priceCents: number) => {
    console.log('[Products] Price changed for product:', productId, 'Price:', priceCents);
    setConfiguredPrices(prev => ({ ...prev, [productId]: priceCents }));
  };

  const handleConfigChange = (productId: string, config: Record<string, string>) => {
    setProductConfigs(prev => ({ ...prev, [productId]: config }));
  };

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, ProductRow[]> = {};
    rows.forEach(product => {
      const category = product.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(product);
    });
    return groups;
  }, [rows]);

  return (
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10 relative">
        {/* Left: Back button */}
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Center: Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          SELECT PRODUCTS
        </h1>

        {/* Right: Cart button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/cart")}
          className="rounded-full border-white/50 bg-white/10 text-white hover:bg-white/20 relative flex items-center gap-2 pr-4"
        >
          <div className="relative">
            <ShoppingCart className="w-4 h-4" />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-semibold">{count} items</span>
            <span className="text-[10px] opacity-90">${(totalCents / 100).toFixed(2)}</span>
          </div>
        </Button>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16 pb-24">
        <section className="relative min-h-screen py-12">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-7xl mx-auto px-6 pt-6">
            {loading && <p className="text-center text-xl">Loading products…</p>}
            {err && (
              <div className="border border-red-400/50 bg-red-900/30 text-white p-6 rounded-xl max-w-2xl mx-auto space-y-4">
                <p className="text-center">{err}</p>
                <div className="flex justify-center">
                  <Button
                    onClick={fetchProducts}
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {!loading && !err && (
              <div className="space-y-12">
                {Object.entries(groupedProducts).map(([category, products]) => (
                  <div key={category} className="space-y-6">
                    <h2 className="text-3xl font-bold text-white uppercase tracking-wider border-b border-white/20 pb-3">
                      {category}
                    </h2>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
                      {products.map((product) => {
                        // Calculate price with global markup for SinaLite products
                        let displayPriceCents = product.base_cost_cents || 100;
                        
                        if (product.vendor === "sinalite" && pricingSettings) {
                          const pricing = computeGlobalPricing({
                            vendor: "sinalite",
                            base_cost_cents: product.base_cost_cents || 0,
                            settings: pricingSettings
                          });
                          displayPriceCents = pricing.final_price_per_unit_cents;
                        } else if (product.price_override_cents && product.price_override_cents > 0) {
                          displayPriceCents = product.price_override_cents;
                        }
                        
                        const qty = quantities[product.id] || 0;
                        const requiresConfiguration = product.pricing_data && 
                          Array.isArray(product.pricing_data) && 
                          product.pricing_data.length > 0;
                        const isConfigured = requiresConfiguration ? !!configuredPrices[product.id] : true;
                        const canAddToCart = isConfigured;
                        const isInCart = items.some(item => item.id === product.id);

                        return (
                          <ProductCard
                            key={product.id}
                            product={product}
                            displayPriceCents={displayPriceCents}
                            quantity={qty}
                            isInCart={isInCart}
                            requiresConfiguration={requiresConfiguration}
                            isConfigured={isConfigured}
                            canAddToCart={canAddToCart}
                            onQuantityChange={updateQuantity}
                            onAddToCart={handleAddToCart}
                            onPriceChange={handlePriceChange}
                            onConfigChange={handleConfigChange}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating checkout bar */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-t border-white/20">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="text-white">
              <div className="text-sm opacity-80">{count} item(s) in cart</div>
              <div className="text-xl font-semibold">${(totalCents / 100).toFixed(2)}</div>
            </div>
            <Button
              onClick={() => navigate("/cart")}
              variant="outline"
              size="lg"
              className="rounded-full border-white/50 bg-transparent text-white hover:bg-white/10"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-semibold">View Cart ({count})</span>
                <span className="text-xs opacity-90">${(totalCents / 100).toFixed(2)}</span>
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
