import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import VideoBackground from "@/components/VideoBackground";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import CompactMilestoneBar from "@/components/CompactMilestoneBar";

type FavoriteProduct = {
  id: string;
  name: string;
  description?: string | null;
  base_cost_cents: number;
  price_override_cents?: number | null;
  image_url?: string | null;
  category?: string | null;
  pricing_data?: any;
  vendor?: string | null;
  vendor_product_id?: string | null;
};

export default function Favorites() {
  const navigate = useNavigate();
  const { add, items, count, totalCents } = useCart();
  const { refreshFavorites } = useFavorites();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [configuredPrices, setConfiguredPrices] = useState<Record<string, number>>({});
  const [productConfigs, setProductConfigs] = useState<Record<string, Record<string, string>>>({});
  const [quantityOptions, setQuantityOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Please log in to view favorites");
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchFavorites(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Sync quantities with cart items
  useEffect(() => {
    const cartQuantities: Record<string, number> = {};
    items.forEach(item => {
      cartQuantities[item.id] = item.quantity;
    });
    setQuantities(cartQuantities);
  }, [items]);

  const fetchFavorites = async (userId: string) => {
    setLoading(true);
    try {
      // Get favorite product IDs
      const { data: favoriteRecords, error: favError } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", userId);

      if (favError) throw favError;

      if (!favoriteRecords || favoriteRecords.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Get product details
      const productIds = favoriteRecords.map(f => f.product_id);
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("id, name, base_cost_cents, price_override_cents, image_url, category, vendor, pricing_data, vendor_product_id")
        .in("id", productIds)
        .eq("is_active", true);

      if (prodError) throw prodError;

      // Filter out Canada products
      const filteredProducts = (products || []).filter(product => !product.name.toLowerCase().includes('canada'));
      setFavorites(filteredProducts);
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) throw error;

      setFavorites(prev => prev.filter(p => p.id !== productId));
      await refreshFavorites(); // Refresh global state
      toast.success("Removed from favorites");
    } catch (error: any) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove from favorites");
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  const handleAddToCart = (product: FavoriteProduct) => {
    const requiresConfiguration = product.pricing_data && 
      Array.isArray(product.pricing_data) && 
      product.pricing_data.length > 0;
    
    const isConfigured = !!configuredPrices[product.id];

    if (requiresConfiguration && !isConfigured) {
      toast.error("Please configure product options first");
      return;
    }

    const qty = quantities[product.id] || 1;
    const unitCents = configuredPrices[product.id];

    if (!unitCents || unitCents <= 0) {
      toast.error("Please configure product to see pricing");
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
    setConfiguredPrices(prev => ({ ...prev, [productId]: priceCents }));
  };

  const handleConfigChange = (productId: string, config: Record<string, string>) => {
    setProductConfigs(prev => ({ ...prev, [productId]: config }));
  };

  const handleQuantityOptionsChange = (productId: string, options: string[]) => {
    setQuantityOptions(prev => ({ ...prev, [productId]: options }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />
        <div className="relative text-white text-lg">Loading favorites...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10 relative">
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="absolute left-1/2 -translate-x-1/2 tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          My Favorites
        </h1>

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
            {/* Milestone Progress Bar */}
            <CompactMilestoneBar />
            
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <Heart className="w-24 h-24 text-white/30" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">No favorites yet</h2>
                  <p className="text-white/70">Start adding products to your wishlist!</p>
                </div>
                <Button
                  onClick={() => navigate("/products")}
                  size="lg"
                  className="rounded-full"
                >
                  Browse Products
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map(product => {
                  const requiresConfiguration = product.pricing_data && 
                    Array.isArray(product.pricing_data) && 
                    product.pricing_data.length > 0;
                  
                  const isConfigured = !!configuredPrices[product.id];
                  const displayPrice = configuredPrices[product.id] || 0;
                  const isInCart = items.some(item => item.id === product.id);
                  const canAddToCart = requiresConfiguration ? isConfigured : displayPrice > 0;

                  return (
                    <div key={product.id} className="relative group">
                      {/* Remove from favorites button */}
                      <button
                        onClick={() => handleRemoveFavorite(product.id)}
                        className="absolute top-3 right-3 z-20 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110 flex items-center gap-1"
                        aria-label="Remove from wishlist"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      {/* Mobile-visible remove button */}
                      <button
                        onClick={() => handleRemoveFavorite(product.id)}
                        className="md:hidden absolute top-3 right-3 z-20 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
                        aria-label="Remove from wishlist"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="space-y-3">
                        <ProductCard
                          product={product}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
