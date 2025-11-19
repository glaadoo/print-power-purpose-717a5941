import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ProductConfiguratorLoader from "@/components/ProductConfiguratorLoader";
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
                          <GlassCard key={product.id} padding="p-6">
                            <div className="flex flex-col items-start text-left space-y-4 w-full">
                              {/* Product Image */}
                              <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/10">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback to placeholder if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement!.innerHTML = `
                                        <div class="w-full h-full flex items-center justify-center bg-white/5">
                                          <div class="text-center p-4">
                                            <svg class="w-16 h-16 mx-auto text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p class="text-white/40 text-xs mt-2">No image</p>
                                          </div>
                                        </div>
                                      `;
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                                    <div className="text-center p-4">
                                      <svg className="w-16 h-16 mx-auto text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <p className="text-white/40 text-xs mt-2">No image available</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between w-full">
                                <h3 className="text-lg font-bold text-white">
                                  {product.name}
                                </h3>
                                {isInCart && (
                                  <Badge className="bg-green-600 text-white border-green-400 text-xs">
                                    In Cart
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="w-full space-y-3">
                              {/* Show base price with markup */}
                              <div className="w-full py-2 px-4 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-sm text-white/60 text-center mb-1">
                                  {product.pricing_data && Array.isArray(product.pricing_data) && product.pricing_data.length > 0 
                                    ? "Starting at" 
                                    : "Price"}
                                </p>
                                <p className="text-2xl font-bold text-white text-center">
                                  ${(displayPriceCents / 100).toFixed(2)}
                                </p>
                                {product.vendor === "sinalite" && pricingSettings && pricingSettings.markup_fixed_cents > 0 && (
                                  <p className="text-xs text-white/50 text-center mt-1">
                                    Includes ${(pricingSettings.markup_mode === "fixed" 
                                      ? pricingSettings.markup_fixed_cents / 100 
                                      : (displayPriceCents - (product.base_cost_cents || 0)) / 100
                                    ).toFixed(2)} to your chosen nonprofit
                                  </p>
                                )}
                              </div>
                              
                              {/* Only show configurator for products that need it */}
                              {product.pricing_data && Array.isArray(product.pricing_data) && product.pricing_data.length > 0 && (
                                <ProductConfiguratorLoader
                                  productId={product.id}
                                  onPriceChange={(price) => handlePriceChange(product.id, price)}
                                  onConfigChange={(config) => handleConfigChange(product.id, config)}
                                />
                              )}
                              
                              {configuredPrices[product.id] && (
                                <div className="w-full py-2 px-4 bg-green-900/20 border border-green-400/30 rounded-lg">
                                  <p className="text-xs text-green-200 text-center mb-1">Configured Price</p>
                                  <p className="text-2xl font-bold text-green-100 text-center">
                                    ${(configuredPrices[product.id] / 100).toFixed(2)}
                                  </p>
                                </div>
                              )}
                              </div>

                              <div className="flex items-center gap-2 w-full justify-between py-2">
                                <span className="text-sm text-white/80">Quantity:</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 rounded-full border-white/50 bg-white/10 text-white hover:bg-white/20"
                                    onClick={() => updateQuantity(product.id, -1)}
                                    disabled={qty === 0}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  
                                  <span className="text-lg font-semibold text-white min-w-[2.5rem] text-center">
                                    {qty}
                                  </span>
                                  
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 rounded-full border-white/50 bg-white/10 text-white hover:bg-white/20"
                                    onClick={() => updateQuantity(product.id, 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

                              {!isConfigured && (
                                <p className="text-xs text-yellow-300 w-full">
                                  Configure options above before adding to cart
                                </p>
                              )}

                              <Button
                                onClick={() => handleAddToCart(product)}
                                disabled={qty === 0 || !canAddToCart}
                                variant="outline"
                                className="w-full rounded-lg border-white/50 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Add to Cart
                              </Button>
                            </div>
                          </GlassCard>
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
