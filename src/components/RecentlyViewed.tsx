import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getRecentlyViewed, type RecentlyViewedProduct } from "@/lib/recently-viewed";
import GlassCard from "./GlassCard";
import { Button } from "./ui/button";
import { Clock, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import useToggle from "@/hooks/useToggle";

type ProductDetails = RecentlyViewedProduct & {
  base_cost_cents?: number;
  pricing_data?: any;
  description?: string | null;
  subcategory?: string | null;
};

function RecentlyViewedCard({ product, onClick }: { product: ProductDetails; onClick: () => void }) {
  const { open: descriptionOpen, toggle: toggleDescription } = useToggle(false);
  
  return (
    <div className="flex-shrink-0 w-[250px]">
      <GlassCard padding="p-4">
        <div className="cursor-pointer space-y-3">
          {/* Product Image */}
          <div 
            onClick={onClick}
            className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/10"
          >
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#0057FF] line-clamp-2" onClick={onClick}>
              {product.name}
            </h3>
            {product.category && (
              <p className="text-xs text-gray-600">{product.category}</p>
            )}
            <p className="text-xs text-gray-500">
              Viewed {formatTimeAgo(product.viewedAt)}
            </p>
            
            {/* Description Toggle */}
            {product.description && (
              <Collapsible open={descriptionOpen} onOpenChange={toggleDescription}>
                <CollapsibleTrigger 
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>{descriptionOpen ? 'Hide Details' : 'Show Details'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${descriptionOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-accordion-down">
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3">
                    {product.description}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* View Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            View Product
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

export default function RecentlyViewed() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  const loadRecentlyViewed = async () => {
    setLoading(true);
    try {
      const recent = getRecentlyViewed();
      
      if (recent.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch full product details from database
      const productIds = recent.map(p => p.id);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, image_url, category, base_cost_cents, pricing_data, description")
        .in("id", productIds)
        .eq("is_active", true);

      if (error) throw error;

      // Merge with recently viewed data (to preserve order, viewedAt, and subcategory from localStorage)
      const enriched = recent
        .map(recentProduct => {
          const fullProduct = data?.find(p => p.id === recentProduct.id);
          if (!fullProduct) return null;
          
          return {
            ...fullProduct,
            ...recentProduct, // Preserve localStorage data (subcategory, viewedAt) over DB data
          };
        })
        .filter(Boolean) as ProductDetails[];

      // Filter out Canada products
      const filteredProducts = enriched.filter(product => !product.name.toLowerCase().includes('canada'));
      setProducts(filteredProducts);
    } catch (error) {
      console.error("Error loading recently viewed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: ProductDetails) => {
    // Generate slug from name
    const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const categorySlug = slugify(product.category || 'uncategorized');
    const subcategorySlug = product.subcategory ? slugify(product.subcategory) : 'all';
    const productSlug = slugify(product.name);
    navigate(`/products/${categorySlug}/${subcategorySlug}/${productSlug}`, { state: { productId: product.id } });
  };

  const scrollLeft = () => {
    const container = document.getElementById('recently-viewed-container');
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      setScrollPosition(container.scrollLeft - scrollAmount);
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('recently-viewed-container');
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setScrollPosition(container.scrollLeft + scrollAmount);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-white/70" />
          <h2 className="text-xl font-bold text-white">Recently Viewed</h2>
        </div>
        <div className="text-white/60 text-sm">Loading...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 section-title" />
          <h2 className="text-xl font-bold section-title">Recently Viewed</h2>
          <span className="text-sm text-gray-600">({products.length})</span>
        </div>
        
        {products.length > 3 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollLeft}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollRight}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div 
        id="recently-viewed-container"
        className="flex gap-4 overflow-x-auto pb-4 scroll-smooth hide-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {products.map(product => (
          <RecentlyViewedCard 
            key={product.id} 
            product={product} 
            onClick={() => handleProductClick(product)} 
          />
        ))}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Format timestamp to human-readable "time ago"
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}
