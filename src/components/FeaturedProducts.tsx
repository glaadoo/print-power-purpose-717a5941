import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";
import { Button } from "./ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

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
  vendor_product_id?: string | null;
};

export default function FeaturedProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: "start",
      slidesToScroll: 1,
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    async function loadFeaturedProducts() {
      try {
        console.log("[FeaturedProducts] Starting to load products...");
        const { data, error } = await supabase
          .from("products")
          .select("id, name, description, base_cost_cents, price_override_cents, image_url, category, vendor, vendor_product_id, pricing_data")
          .eq("is_active", true)
          .limit(12);

        if (error) {
          console.error("[FeaturedProducts] Error loading:", error);
          setProducts([]);
        } else {
          console.log("[FeaturedProducts] Loaded products:", data?.length);
          // Filter out Canada products
          const filteredProducts = (data || []).filter(product => !product.name.toLowerCase().includes('canada'));
          setProducts(filteredProducts);
        }
      } catch (error) {
        console.error("[FeaturedProducts] Exception:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadFeaturedProducts();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-12">
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
    );
  }

  // Show friendly message if products failed to load
  if (products.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Featured Products
          </h2>
          <p className="text-gray-600 mb-8">
            Products are currently being loaded. Please check back soon!
          </p>
          <Button
            onClick={() => navigate("/products")}
            className="rounded-full bg-blue-600 text-white hover:bg-blue-700 px-8 py-6 text-lg font-semibold"
          >
            View All Products
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white py-16 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Featured Products
            </h2>
            <p className="text-gray-600">Browse our most popular printing products</p>
          </div>
          
          {/* Navigation Arrows */}
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

        <div className="text-center mt-10">
          <Button
            onClick={() => navigate("/products")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg text-base"
          >
            View All Products
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
