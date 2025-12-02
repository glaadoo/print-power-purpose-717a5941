import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    min_price_cents?: number | null;
    category?: string | null;
  };
  categorySlug?: string;
  subcategorySlug?: string;
  compact?: boolean;
};

export default function ProductCard({ product, categorySlug, subcategorySlug, compact = false }: ProductCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  // Try image_url first, then fallback to first color image from pricing_data (for Scalable Press)
  const getImageUrl = () => {
    if (product.image_url) return product.image_url;
    if (product.generated_image_url) return product.generated_image_url;
    
    // Fallback: try to get image from pricing_data colors (Scalable Press)
    if (product.pricing_data?.colors?.length > 0) {
      for (const color of product.pricing_data.colors) {
        if (color.images && color.images.length > 0) {
          const firstImage = color.images[0];
          const url = typeof firstImage === 'string' ? firstImage : firstImage?.url;
          if (url) return url;
        }
      }
    }
    return null;
  };
  const imageSrc = getImageUrl();
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

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Use provided categorySlug and subcategorySlug if available (from subcategory page)
    if (categorySlug && subcategorySlug) {
      navigate(`/products/${categorySlug}/${subcategorySlug}/${productSlug}`, { state: { productId: product.id } });
    } else {
      // Fallback: extract from product.category (legacy behavior)
      const categoryParts = (product.category || 'uncategorized').toLowerCase().split('/');
      const fallbackCategorySlug = categoryParts[0].replace(/\s+/g, '-');
      const fallbackSubcategorySlug = categoryParts.length > 1 
        ? categoryParts[1].replace(/\s+/g, '-')
        : 'all';
      navigate(`/products/${fallbackCategorySlug}/${fallbackSubcategorySlug}/${productSlug}`, { state: { productId: product.id } });
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden group ${
        compact ? 'text-sm' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Product Image */}
      <div className={`relative w-full overflow-hidden bg-gray-50 ${compact ? 'aspect-[4/3]' : 'aspect-square'}`}>
        {imageSrc && !imageError ? (
          <img 
            src={imageSrc} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg className={`text-gray-300 ${compact ? 'w-12 h-12' : 'w-20 h-20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {/* Action Buttons Overlay - hide in compact mode */}
        {!compact && (
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleComparison}
              className={`p-2 rounded-full shadow-lg transition-all ${
                isInCompare 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              aria-label={isInCompare ? "Remove from comparison" : "Add to comparison"}
            >
              <Scale className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-full shadow-lg transition-all ${
                isProductFavorite 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              aria-label={isProductFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-4 h-4 ${isProductFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className={compact ? 'p-2' : 'p-4'}>
        {/* Category Label */}
        <p className={`text-gray-500 uppercase tracking-wide mb-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {product.category || "Product"}
        </p>
        
        {/* Product Name */}
        <h3 className={`font-bold product-name line-clamp-2 mb-1 ${compact ? 'text-xs min-h-[32px]' : 'text-base min-h-[48px] mb-2'}`}>
          {product.name}
        </h3>
        
        {/* Description - show inline for non-SinaLite, hide Show Details for SinaLite */}
        {!compact && product.description && product.vendor !== 'sinalite' && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        
        {/* Rating - hide in compact mode */}
        {!compact && averageRating !== null && reviewCount > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">
              {averageRating.toFixed(1)} ({reviewCount})
            </span>
          </div>
        )}
        
        {/* Price */}
        <p className={`font-bold text-gray-900 mb-2 ${compact ? 'text-sm' : 'text-xl mb-3'}`}>
          {product.vendor === 'sinalite' ? (
            // SinaLite: show actual price only if we have real pricing data, otherwise show "Configure for Price"
            product.min_price_cents && product.min_price_cents !== 2000 ? (
              <>Starting at ${(product.min_price_cents / 100).toFixed(2)}</>
            ) : product.base_cost_cents && product.base_cost_cents !== 2000 ? (
              <>Starting at ${(product.base_cost_cents / 100).toFixed(2)}</>
            ) : (
              <span className="text-blue-600">Configure for Price</span>
            )
          ) : product.vendor === 'scalablepress' ? (
            // Scalable Press: single price per product (all variants same price)
            // Always show the stored price - no configuration-based pricing
            <>Price: ${(product.base_cost_cents / 100).toFixed(2)}</>
          ) : (
            // Other vendors: show base cost, or "Configure for Price" if default
            product.base_cost_cents && product.base_cost_cents !== 1000 ? (
              <>${(product.base_cost_cents / 100).toFixed(2)}</>
            ) : (
              <span className="text-blue-600">Configure for Price</span>
            )
          )}
        </p>
        
        {/* CTA Button */}
        <button 
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors ${
            compact ? 'py-1.5 px-2 text-xs' : 'py-2.5 px-4'
          }`}
          onClick={handleCardClick}
        >
          {compact ? 'View' : 'Customize'}
        </button>
      </div>
    </div>
  );
}
