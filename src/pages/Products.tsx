// src/pages/Products.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  base_cost_cents: number;
  price_override_cents?: number | null;
  image_url?: string | null;
  category?: string | null;
};

const getProductPrice = (product: ProductRow) => {
  // Use price override if available, otherwise calculate from base cost
  if (product.price_override_cents && product.price_override_cents > 0) {
    return product.price_override_cents;
  }
  return Math.max(100, Math.round((product.base_cost_cents || 0) * 1.6));
};

export default function Products() {
  const navigate = useNavigate();
  const { add, items, count, totalCents } = useCart();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

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
    
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) setErr(error.message);
      else setRows((data as ProductRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  const handleAddToCart = (product: ProductRow) => {
    const qty = quantities[product.id] || 1;
    const unitCents = getProductPrice(product);
    
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
              <div className="border border-red-400/50 bg-red-900/30 text-white p-4 rounded-xl max-w-2xl mx-auto">
                {err}
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
                        const unitCents = getProductPrice(product);
                        const unitPrice = unitCents / 100;
                        const qty = quantities[product.id] || 0;

                        return (
                          <GlassCard key={product.id} padding="p-6">
                            <div className="flex flex-col items-center text-center space-y-3">
                              <h3 className="text-xl font-bold text-white">
                                {product.name}
                              </h3>
                              
                              <p className="text-3xl font-bold text-white">
                                ${unitPrice.toFixed(2)}
                              </p>

                              <div className="flex items-center justify-center gap-3 py-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="rounded-full w-10 h-10 border-white/50 bg-white/10 text-white hover:bg-white/20"
                                  onClick={() => updateQuantity(product.id, -1)}
                                  disabled={qty === 0}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                
                                <span className="text-2xl font-semibold text-white min-w-[3rem] text-center">
                                  {qty}
                                </span>
                                
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="rounded-full w-10 h-10 border-white/50 bg-white/10 text-white hover:bg-white/20"
                                  onClick={() => updateQuantity(product.id, 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>

                              <Button
                                onClick={() => handleAddToCart(product)}
                                disabled={qty === 0}
                                variant="outline"
                                className="w-full rounded-full border-white/50 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
