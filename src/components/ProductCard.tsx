import { useState, useEffect } from "react";
import GlassCard from "./GlassCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, Minus, Heart, Star } from "lucide-react";
import ProductConfiguratorLoader from "./ProductConfiguratorLoader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFavorites } from "@/context/FavoritesContext";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    description?: string | null;
    vendor?: string | null;
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
  const [user, setUser] = useState<any>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const imageSrc = product.image_url || null;
  const { isFavorite, toggleFavorite: toggleFavoriteContext } = useFavorites();
  const isProductFavorite = isFavorite(product.id);

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch review statistics
  useEffect(() => {
    fetchReviewStats();
  }, [product.id]);

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

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error("Please log in to save favorites");
      return;
    }

    try {
      await toggleFavoriteContext(product.id);
      toast.success(isProductFavorite ? "Removed from favorites" : "Added to favorites");
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
          onClick={handleToggleFavorite}
          className={`absolute top-1 right-1 z-10 p-2 rounded-full transition-all ${
            isProductFavorite 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
          }`}
          aria-label={isProductFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`w-5 h-5 ${isProductFavorite ? 'fill-current' : ''}`} />
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
          
          {/* Product Description */}
          {product.description && (
            <p className="text-sm text-white/70 text-center line-clamp-2">
              {product.description}
            </p>
          )}
          
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

          {/* Price Display - only show configured price */}
          {displayPriceCents > 0 && (
            <p className="text-2xl font-bold text-white">
              ${(displayPriceCents / 100).toFixed(2)}
            </p>
          )}
          
          {isInCart && (
            <Badge className="bg-green-600 text-white border-green-400 text-xs">
              In Cart
            </Badge>
          )}
        </div>
        

        {/* Product Configuration - Auto-expanded */}
        {requiresConfiguration && product.vendor === 'sinalite' && (
          <div className="w-full">
            <ProductConfiguratorLoader
              productId={product.id}
              onPriceChange={(price) => onPriceChange(product.id, price)}
              onConfigChange={(config) => onConfigChange(product.id, config)}
              onQuantityOptionsChange={onQuantityOptionsChange ? (options) => onQuantityOptionsChange(product.id, options) : undefined}
            />
          </div>
        )}
        
        {/* Scalable Press Configuration */}
        {product.vendor === 'scalablepress' && product.pricing_data && (
          <div className="w-full space-y-3">
            {/* Colors */}
            {product.pricing_data.colors && Array.isArray(product.pricing_data.colors) && product.pricing_data.colors.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Select Color:</label>
                <div className="flex flex-wrap gap-2">
                  {product.pricing_data.colors.map((color: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(color.name)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
                        selectedColor === color.name
                          ? 'bg-white/30 border-2 border-white'
                          : 'bg-white/10 border border-white/20 hover:bg-white/20'
                      }`}
                      title={color.name}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-xs text-white">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sizes */}
            {product.pricing_data.sizes && Array.isArray(product.pricing_data.sizes) && product.pricing_data.sizes.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Select Size:</label>
                <div className="flex flex-wrap gap-2">
                  {product.pricing_data.sizes.map((size: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1 rounded-full text-xs transition-all ${
                        selectedSize === size
                          ? 'bg-white/30 border-2 border-white text-white font-semibold'
                          : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Material/Brand Info */}
            {(product.pricing_data.brand || product.pricing_data.material) && (
              <div className="text-xs text-white/60 space-y-1">
                {product.pricing_data.brand && <div>Brand: {product.pricing_data.brand}</div>}
                {product.pricing_data.material && <div>Material: {product.pricing_data.material}</div>}
              </div>
            )}
          </div>
        )}

        {/* Quantity Controls - Show for all products with valid price */}
        {displayPriceCents > 0 && (
          <div className="flex items-center justify-center gap-3 w-full">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onQuantityChange(product.id, -1)}
              disabled={quantity === 0}
              className="bg-white border-white/30 text-black hover:bg-white/90"
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
              className="bg-white border-white/30 text-black hover:bg-white/90"
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
