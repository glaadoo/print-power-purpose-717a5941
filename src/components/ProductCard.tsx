import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "./GlassCard";
import { Heart, Star, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFavorites } from "@/context/FavoritesContext";
import { useComparison } from "@/context/ComparisonContext";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    description?: string | null;
    vendor?: string | null;
    image_url?: string | null;
    generated_image_url?: string | null;
    pricing_data?: any;
    base_cost_cents: number;
    category?: string | null;
  };
};

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const imageSrc = product.image_url || null;
  const { isFavorite, toggleFavorite: toggleFavoriteContext } = useFavorites();
  const isProductFavorite = isFavorite(product.id);
  const { add: addToComparison, remove: removeFromComparison, isInComparison, canAddMore } = useComparison();
  const isInCompare = isInComparison(product.id);

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

  const handleToggleComparison = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInCompare) {
      removeFromComparison(product.id);
      toast.success("Removed from comparison");
    } else {
      if (!canAddMore) {
        toast.error("Maximum 4 products can be compared");
        return;
      }
      addToComparison({
        id: product.id,
        name: product.name,
        description: product.description,
        base_cost_cents: product.base_cost_cents,
        image_url: product.image_url,
        category: product.category,
        vendor: product.vendor,
        pricing_data: product.pricing_data,
      });
      toast.success("Added to comparison");
    }
  };

  const handleCardClick = () => {
    const categorySlug = (product.category || 'uncategorized').toLowerCase().replace(/\s+/g, '-');
    const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    navigate(`/product/${categorySlug}/${productSlug}`, { state: { productId: product.id } });
  };

  return (
    <GlassCard 
      padding="p-6" 
      className="group cursor-pointer hover:scale-105 transition-transform duration-200"
      onClick={handleCardClick}
    >
      <div className="flex flex-col items-start text-left space-y-4 w-full relative">
        {/* Action Buttons - Top Right */}
        <div className="absolute top-1 right-1 z-10 flex gap-1">
          {/* Compare Button */}
          <button
            onClick={handleToggleComparison}
            className={`p-2 rounded-full transition-all ${
              isInCompare 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            aria-label={isInCompare ? "Remove from comparison" : "Add to comparison"}
          >
            <Scale className={`w-5 h-5 ${isInCompare ? 'fill-current' : ''}`} />
          </button>
          
          {/* Favorite Heart Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite();
            }}
            className={`p-2 rounded-full transition-all ${
              isProductFavorite 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            aria-label={isProductFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`w-5 h-5 ${isProductFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

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
        
        {/* Product Title */}
        <div className="flex flex-col items-center justify-center w-full space-y-2 min-h-[60px]">
          <h3 className="text-lg font-bold text-white text-center group-hover:text-primary-foreground transition-colors drop-shadow-lg line-clamp-2">
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
        </div>
      </div>
    </GlassCard>
  );
}
