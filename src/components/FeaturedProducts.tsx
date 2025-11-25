import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";
import { Button } from "./ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { addRecentlyViewed } from "@/lib/recently-viewed";
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
  const { items, add } = useCart();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [configuredPrices, setConfiguredPrices] = useState<Record<string, number>>({});
  const [productConfigs, setProductConfigs] = useState<Record<string, Record<string, string>>>({});
  const [quantityOptions, setQuantityOptions] = useState<Record<string, string[]>>({});
  
  // Autoplay plugin with 5 second interval and pause on hover
  const autoplayPlugin = useCallback(() => {
    return Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true });
  }, []);
  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [autoplayPlugin()]
  );

  // Sync quantities with cart items
  useEffect(() => {
    const cartQuantities: Record<string, number> = {};
    items.forEach(item => {
      cartQuantities[item.id] = item.quantity;
    });
    setQuantities(cartQuantities);
  }, [items]);

  useEffect(() => {
    async function loadFeaturedProducts() {
      try {
        console.log("[FeaturedProducts] Starting to load products...");
        const { data, error } = await supabase
          .from("products")
          .select("id, name, description, base_cost_cents, price_override_cents, image_url, category, vendor, vendor_product_id, pricing_data")
          .eq("is_active", true)
          .limit(8);

        if (error) {
          console.error("[FeaturedProducts] Error loading:", error);
          setProducts([]);
        } else {
          console.log("[FeaturedProducts] Loaded products:", data?.length);
          setProducts(data || []);
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

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [productId]: newQty };
    });
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

  const handleAddToCart = (product: ProductRow) => {
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      image_url: product.image_url,
      category: product.category
    });

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

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded w-64 mx-auto mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-96 bg-white/10 rounded-2xl"></div>
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Featured Products
          </h2>
          <p className="text-white/60 mb-8">
            Products are currently being loaded. Please check back soon!
          </p>
          <Button
            onClick={() => navigate("/products")}
            className="rounded-full bg-white text-black hover:bg-white/90 px-8 py-6 text-lg font-semibold"
          >
            View All Products
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold section-title mb-3">
            Popular Products
          </h2>
          <div className="w-24 h-1 bg-blue-600 mx-auto"></div>
        </div>

        <div className="relative">
          {/* Carousel Container */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {products.map(product => (
                <div key={product.id} className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_25%] min-w-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors z-10"
            aria-label="Previous products"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors z-10"
            aria-label="Next products"
          >
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>
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
