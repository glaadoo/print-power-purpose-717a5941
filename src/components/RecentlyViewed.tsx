import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getRecentlyViewed, type RecentlyViewedProduct } from "@/lib/recently-viewed";
import ProductCard from "./ProductCard";
import { Button } from "./ui/button";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { shouldShowProduct } from "@/lib/product-utils";
import useEmblaCarousel from "embla-carousel-react";

type ProductDetails = RecentlyViewedProduct & {
  base_cost_cents: number;
  pricing_data?: any;
  description?: string | null;
  subcategory?: string | null;
  vendor?: string | null;
  is_active?: boolean | null;
  min_price_cents?: number | null;
  min_price_variant_key?: string | null;
  price_override_cents?: number | null;
  vendor_product_id?: string | null;
  generated_image_url?: string | null;
};

export default function RecentlyViewed() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

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
        .select("id, name, image_url, generated_image_url, category, base_cost_cents, pricing_data, description, vendor, is_active, min_price_cents, min_price_variant_key, price_override_cents, vendor_product_id")
        .in("id", productIds)
        .eq("is_active", true);

      if (error) throw error;

      // Merge with recently viewed data (to preserve order, viewedAt, and subcategory from localStorage)
      const enriched = recent
        .map(recentProduct => {
          const fullProduct = data?.find(p => p.id === recentProduct.id);
          if (!fullProduct || fullProduct.base_cost_cents === null || fullProduct.base_cost_cents === undefined) return null;
          
          return {
            ...fullProduct,
            ...recentProduct, // Preserve localStorage data (subcategory, viewedAt) over DB data
            base_cost_cents: fullProduct.base_cost_cents,
          };
        })
        .filter(Boolean) as ProductDetails[];

      // Filter out Canada products and products without images
      const filteredProducts = enriched.filter(product => shouldShowProduct(product));
      setProducts(filteredProducts);
    } catch (error) {
      console.error("Error loading recently viewed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-white py-16 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-8"></div>
              <div className="flex gap-6 overflow-hidden">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-2xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-16 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Recently Viewed
              </h2>
              <span className="text-sm text-gray-500 ml-2">({products.length})</span>
            </div>
            <p className="text-gray-600">Continue where you left off</p>
          </div>
          
          {/* Navigation Arrows */}
          {products.length > 3 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={scrollPrev}
                className="rounded-full border-gray-300 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={scrollNext}
                className="rounded-full border-gray-300 hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {products.map(product => (
              <div key={product.id} className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
