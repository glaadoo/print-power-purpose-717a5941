import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

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

  useEffect(() => {
    async function loadFeaturedProducts() {
      try {
        console.log("[FeaturedProducts] Starting to load products...");
        const { data, error } = await supabase
          .from("products")
          .select("id, name, description, base_cost_cents, price_override_cents, image_url, category, vendor, vendor_product_id, pricing_data")
          .eq("is_active", true)
          .limit(18);

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
            <div className="h-8 bg-white/20 rounded w-64 mx-auto mb-8"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                <div key={i} className="h-72 bg-white/10 rounded-2xl"></div>
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
        </div>

        {/* Grid Layout - 18 products */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} compact />
          ))}
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
