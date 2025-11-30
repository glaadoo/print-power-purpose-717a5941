import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import VistaprintNav from "@/components/VistaprintNav";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductFilterSidebar from "@/components/ProductFilterSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, ShoppingCart, ArrowUp, X } from "lucide-react";
import { toast } from "sonner";
import { computeGlobalPricing, type PricingSettings } from "@/lib/global-pricing";
import Footer from "@/components/Footer";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  base_cost_cents: number;
  min_price_cents?: number | null;
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Initialize filters from localStorage
  const [filters, setFilters] = useState(() => {
    const stored = localStorage.getItem('product-subcategory-filters');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {
          priceRange: [0, 100000] as [number, number],
          vendors: [] as string[],
          minRating: 0,
        };
      }
    }
    return {
      priceRange: [0, 100000] as [number, number],
      vendors: [] as string[],
      minRating: 0,
    };
  });

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
        // Convert slug to match category format - handle both spaced and hyphenated versions
        // Example: "covid-19-decals" should match both "Covid 19 Decals" and "Covid-19 Decals"
        const categorySearch = subcategory
          .replace(/-/g, ' ')  // Replace hyphens with spaces: "covid-19-decals" -> "covid 19 decals"
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .trim();
        
        // Also create a version preserving number-related hyphens for cases like "Covid-19"
        const categorySearchWithHyphens = subcategory
          .replace(/(\d)-(\d)/g, '$1-$2')  // Keep hyphens between numbers: "covid-19-decals" -> keep "19"
          .replace(/-/g, ' ')  // Replace other hyphens with spaces
          .replace(/\s+/g, ' ')
          .trim();
        
        const { data, error: productsError } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .or(`category.ilike.%${categorySearch}%,category.ilike.%${categorySearchWithHyphens}%,category.ilike.%${subcategory.replace(/-/g, '%')}%`);
        
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

  // Get available vendors and max price for filters
  const availableVendors = useMemo(() => {
    const vendors = new Set(products.map(p => p.vendor).filter(Boolean));
    return Array.from(vendors) as string[];
  }, [products]);

  const maxPrice = useMemo(() => {
    const prices = Object.values(defaultPrices);
    return prices.length > 0 ? Math.max(...prices) : 100000;
  }, [defaultPrices]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    // Exclude Canada products first
    let filtered = products.filter(product => !product.name.toLowerCase().includes('canada'));
    
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    // Price range filter
    filtered = filtered.filter(p => {
      const price = defaultPrices[p.id] || 0;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Vendor filter
    if (filters.vendors.length > 0) {
      filtered = filtered.filter(p => 
        p.vendor && filters.vendors.includes(p.vendor)
      );
    }

    // Rating filter (placeholder - you'll need to add ratings to products)
    // For now, this is a stub that doesn't filter anything
    if (filters.minRating > 0) {
      // filtered = filtered.filter(p => p.rating >= filters.minRating);
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
  }, [products, searchTerm, sortBy, defaultPrices, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, subcategory, filters]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Save filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('product-subcategory-filters', JSON.stringify(filters));
  }, [filters]);

  // Show/hide back to top button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeVendorFilter = (vendor: string) => {
    setFilters(prev => ({
      ...prev,
      vendors: prev.vendors.filter(v => v !== vendor)
    }));
  };

  const removePriceRangeFilter = () => {
    setFilters(prev => ({
      ...prev,
      priceRange: [0, maxPrice]
    }));
  };

  const removeRatingFilter = () => {
    setFilters(prev => ({
      ...prev,
      minRating: 0
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      priceRange: [0, maxPrice],
      vendors: [],
      minRating: 0
    });
    localStorage.removeItem('product-subcategory-filters');
  };

  const hasActiveFilters = 
    (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) ||
    filters.vendors.length > 0 ||
    filters.minRating > 0;

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
            Showing {paginatedProducts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {/* Search and Sort */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <ProductFilterSidebar
            filters={filters}
            onFiltersChange={setFilters}
            availableVendors={availableVendors}
            maxPrice={maxPrice}
          />
          
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

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Active Filters:</span>
            
            {/* Price Range Filter Tag */}
            {(filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) && (
              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span>
                  ${(filters.priceRange[0] / 100).toFixed(0)} - ${(filters.priceRange[1] / 100).toFixed(0)}
                </span>
                <button
                  onClick={removePriceRangeFilter}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  aria-label="Remove price filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Vendor Filter Tags */}
            {filters.vendors.map(vendor => (
              <div
                key={vendor}
                className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm capitalize"
              >
                <span>{vendor}</span>
                <button
                  onClick={() => removeVendorFilter(vendor)}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${vendor} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Rating Filter Tag */}
            {filters.minRating > 0 && (
              <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                <span>{filters.minRating}+ Stars</span>
                <button
                  onClick={removeRatingFilter}
                  className="ml-1 hover:bg-yellow-200 rounded-full p-0.5 transition-colors"
                  aria-label="Remove rating filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Clear All Button */}
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-900 underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}

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
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 animate-fade-in">
              {paginatedProducts.map((product, index) => (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10 h-10 rounded-full"
                        >
                          {pageNum}
                        </Button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full"
                >
                  Next
                </Button>
              </div>
            )}
          </>
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

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 z-50 animate-fade-in"
          aria-label="Back to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
