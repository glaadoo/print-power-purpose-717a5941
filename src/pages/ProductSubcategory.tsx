import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import VistaprintNav from "@/components/VistaprintNav";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { computeGlobalPricing, type PricingSettings } from "@/lib/global-pricing";

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

export default function ProductSubcategory() {
  const { category, subcategory } = useParams();
  const navigate = useNavigate();
  const { count, totalCents } = useCart();
  
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "price-low" | "price-high">("name-asc");
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [subcategoryData, setSubcategoryData] = useState<any>(null);

  // Fetch subcategory data
  useEffect(() => {
    const fetchSubcategory = async () => {
      if (!subcategory) return;
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", subcategory)
        .maybeSingle();
      
      if (data) {
        setSubcategoryData(data);
      }
    };
    
    fetchSubcategory();
  }, [subcategory]);

  // Fetch products for this subcategory
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch pricing settings
        const { data: pricingData } = await supabase
          .from("pricing_settings")
          .select("*")
          .eq("vendor", "sinalite")
          .maybeSingle();
        
        if (pricingData) {
          setPricingSettings(pricingData as PricingSettings);
        }

        // Fetch products matching the subcategory
        // Convert slug (pull-up-banners) to match category format (Pull Up Banners)
        // Handle various category formats in database
        const categorySearch = subcategory
          .replace(/-/g, ' ')  // Replace hyphens with spaces
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .trim();
        
        const { data, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .or(`category.ilike.%${categorySearch}%,category.ilike.%${categorySearch}-%`);
        
        if (productsError) throw productsError;
        
        setProducts(data || []);
      } catch (err: any) {
        setError(err.message);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [subcategory]);

  // Compute default prices for products
  const defaultPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    
    products.forEach((p) => {
      if (p.price_override_cents && p.price_override_cents > 0) {
        prices[p.id] = p.price_override_cents;
      } else if (pricingSettings && p.vendor === "sinalite") {
        const computed = computeGlobalPricing({
          vendor: p.vendor,
          base_cost_cents: p.base_cost_cents,
          settings: pricingSettings
        });
        prices[p.id] = computed.final_price_per_unit_cents;
      } else {
        prices[p.id] = p.base_cost_cents;
      }
    });
    
    return prices;
  }, [products, pricingSettings]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "price-low") {
        return (defaultPrices[a.id] || 0) - (defaultPrices[b.id] || 0);
      } else if (sortBy === "price-high") {
        return (defaultPrices[b.id] || 0) - (defaultPrices[a.id] || 0);
      }
      return 0;
    });
    
    return filtered;
  }, [products, searchTerm, sortBy, defaultPrices]);

  return (
    <div className="min-h-screen bg-gray-50">
      <VistaprintNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <button 
            onClick={() => navigate("/products")}
            className="hover:text-blue-600 transition-colors"
          >
            Products
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate("/products")}
            className="hover:text-blue-600 transition-colors capitalize"
          >
            {category?.replace(/-/g, ' ')}
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium capitalize">
            {subcategory?.replace(/-/g, ' ')}
          </span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 capitalize">
            {subcategoryData?.name || subcategory?.replace(/-/g, ' ')}
          </h1>
          <p className="text-gray-600">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {/* Search and Sort */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="price-low">Price (Low to High)</SelectItem>
              <SelectItem value="price-high">Price (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No products found</p>
            <Button onClick={() => navigate("/products")}>
              Browse All Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ProductCard 
                  product={product}
                  categorySlug={category}
                  subcategorySlug={subcategory}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              <span className="font-medium">
                {count} {count === 1 ? 'item' : 'items'} · ${(totalCents / 100).toFixed(2)}
              </span>
            </div>
            <Button onClick={() => navigate("/cart")}>
              View Cart
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
