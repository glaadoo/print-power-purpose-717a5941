import { useState, useEffect } from "react";
import GlassCard from "./GlassCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, Minus, Heart, Star } from "lucide-react";
import ProductConfiguratorLoader from "./ProductConfiguratorLoader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    image_url?: string | null;
    generated_image_url?: string | null;
    pricing_data?: any;
  };
  displayPriceCents: number;
  quantity: number;
  quantityOptions: string[];
  isInCart: boolean;
  requiresConfiguration: boolean;
  isConfigured: boolean;
  canAddToCart: boolean;
  onQuantityChange: (productId: string, delta: number) => void;
  onAddToCart: (product: any) => void;
  onPriceChange: (productId: string, price: number) => void;
  onConfigChange: (productId: string, config: Record<string, string>) => void;
  onQuantityOptionsChange?: (productId: string, options: string[]) => void;
};

export default function ProductCard({
  product,
  displayPriceCents,
  quantity,
  quantityOptions,
  isInCart,
  requiresConfiguration,
  isConfigured,
  canAddToCart,
  onQuantityChange,
  onAddToCart,
  onPriceChange,
  onConfigChange,
  onQuantityOptionsChange,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [firstConfigPrice, setFirstConfigPrice] = useState<number | null>(null);
  const imageSrc = product.image_url || null;

  // Check authentication and favorite status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkFavoriteStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkFavoriteStatus(session.user.id);
      } else {
        setIsFavorite(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [product.id]);

  // Fetch review statistics
  useEffect(() => {
    fetchReviewStats();
  }, [product.id]);

  // Fetch first configuration price
  useEffect(() => {
    if (requiresConfiguration && product.pricing_data) {
      fetchFirstConfigPrice();
    }
  }, [product.id, requiresConfiguration]);

  const fetchFirstConfigPrice = async () => {
    try {
      // Get product data
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("vendor_product_id, pricing_data")
        .eq("id", product.id)
        .maybeSingle();

      if (productError || !productData) return;

      // Extract options from pricing_data
      const pricingData = productData.pricing_data as any;
      const optionsData = pricingData?.options || pricingData?.configurations || pricingData?.attributes;

      if (!Array.isArray(optionsData) || optionsData.length === 0) return;

      // Group options
      const groupMap: Record<string, any[]> = {};
      optionsData.forEach((option: any) => {
        if (!option.group) return;
        if (!groupMap[option.group]) {
          groupMap[option.group] = [];
        }
        groupMap[option.group].push(option);
      });

      // Get first option ID from each group
      const defaultOptionIds = Object.values(groupMap)
        .map(opts => {
          const sorted = opts.sort((a, b) => {
            // Dimension sorting
            const dimensionRegex = /^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)$/;
            const aMatch = a.name.match(dimensionRegex);
            const bMatch = b.name.match(dimensionRegex);
            
            if (aMatch && bMatch) {
              const aWidth = parseFloat(aMatch[1]);
              const bWidth = parseFloat(bMatch[1]);
              if (aWidth !== bWidth) return aWidth - bWidth;
              return parseFloat(aMatch[2]) - parseFloat(bMatch[2]);
            }
            
            // Numeric sorting
            const aNum = parseInt(a.name);
            const bNum = parseInt(b.name);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            
            return a.name.localeCompare(b.name);
          });
          return sorted[0]?.id;
        })
        .filter(Boolean);

      if (defaultOptionIds.length === 0) return;

      // Fetch price using variant key
      const variantKey = defaultOptionIds.sort((a, b) => a - b).join('-');
      const { data: priceData, error: priceError } = await supabase.functions.invoke('sinalite-price', {
        body: {
          productId: productData.vendor_product_id,
          storeCode: 9,
          variantKey: variantKey,
          method: 'PRICEBYKEY'
        },
      });

      if (!priceError && priceData && Array.isArray(priceData) && priceData.length > 0 && priceData[0].price) {
        const priceFloat = parseFloat(priceData[0].price);
        const priceCents = Math.round(priceFloat * 100);
        setFirstConfigPrice(priceCents);
      }
    } catch (error) {
      console.error("Error fetching first config price:", error);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", product.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(avg);
        setReviewCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching review stats:", error);
    }
  };

  const checkFavoriteStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", product.id)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please log in to save favorites");
      return;
    }

    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", product.id);

        if (error) throw error;
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            product_id: product.id
          });

        if (error) throw error;
        setIsFavorite(true);
        toast.success("Added to favorites");
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorites");
    }
  };

  return (
    <GlassCard padding="p-6">
      <div className="flex flex-col items-start text-left space-y-4 w-full relative">
        {/* Favorite Heart Button */}
        <button
          onClick={toggleFavorite}
          className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-all ${
            isFavorite 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
          }`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Product Image */}
        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/10">
          {imageSrc && !imageError ? (
            <img 
              src={imageSrc} 
              alt={product.name}
              className="w-full h-full object-cover"
              loading="eager"
              onError={() => {
                setImageError(true);
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
        
        <div className="flex flex-col items-center justify-center w-full space-y-2">
          <h3 className="text-lg font-bold text-white text-center">
            {product.name}
          </h3>
          
          {/* Rating Display */}
          {averageRating !== null && reviewCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-white/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-white/70">
                {averageRating.toFixed(1)} ({reviewCount})
              </span>
            </div>
          )}
          
          {isInCart && (
            <Badge className="bg-green-600 text-white border-green-400 text-xs">
              In Cart
            </Badge>
          )}
        </div>
        
        <div className="flex flex-col gap-1 w-full items-center text-center">
          {(requiresConfiguration && firstConfigPrice !== null) ? (
            <>
              <p className="text-sm text-white/70">Regular Price:</p>
              <p className="text-2xl font-bold text-white">
                ${(firstConfigPrice / 100).toFixed(2)}
              </p>
            </>
          ) : displayPriceCents > 0 ? (
            <>
              <p className="text-sm text-white/70">Regular Price:</p>
              <p className="text-2xl font-bold text-white">
                ${(displayPriceCents / 100).toFixed(2)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-white/70">Regular Price:</p>
              <p className="text-sm text-white/40 animate-pulse">Loading...</p>
            </>
          )}
        </div>

        {/* Product Configuration */}
        {requiresConfiguration && (
          <div className="w-full">
            <ProductConfiguratorLoader
              productId={product.id}
              onPriceChange={(price) => onPriceChange(product.id, price)}
              onConfigChange={(config) => onConfigChange(product.id, config)}
              onQuantityOptionsChange={onQuantityOptionsChange ? (options) => onQuantityOptionsChange(product.id, options) : undefined}
            />
          </div>
        )}

        {/* Quantity Controls - Only show after options are loaded */}
        {quantityOptions.length > 0 && (
          <div className="flex items-center justify-center gap-3 w-full">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onQuantityChange(product.id, -1)}
              disabled={quantity === 0}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-white font-medium w-12 text-center">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onQuantityChange(product.id, 1)}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Add to Cart Button */}
        <Button
          onClick={() => onAddToCart(product)}
          disabled={!canAddToCart || quantity === 0}
          className="w-full rounded-full"
          size="lg"
        >
          Add to Cart
        </Button>
      </div>
    </GlassCard>
  );
}
