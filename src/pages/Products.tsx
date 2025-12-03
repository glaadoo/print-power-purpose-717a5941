import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import VistaprintNav from "@/components/VistaprintNav";
import ProductMegaMenu from "@/components/ProductMegaMenu";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import RecentlyViewed from "@/components/RecentlyViewed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ShoppingCart, ArrowLeft, Search, X, SlidersHorizontal, Heart, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { withRetry } from "@/lib/api-retry";
import { computeGlobalPricing, type PricingSettings } from "@/lib/global-pricing";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import { cn } from "@/lib/utils";
import useToggle from "@/hooks/useToggle";
import Footer from "@/components/Footer";
import { shouldShowProduct } from "@/lib/product-utils";

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


export default function Products() {
  const navigate = useNavigate();
  const { add, items, count, totalCents } = useCart();
  const { count: favoritesCount } = useFavorites();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [configuredPrices, setConfiguredPrices] = useState<Record<string, number>>({});
  const [productConfigs, setProductConfigs] = useState<Record<string, Record<string, string>>>({});
  const [quantityOptions, setQuantityOptions] = useState<Record<string, string[]>>({});
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "price-low" | "price-high" | "rating-high" | "most-reviewed">("name-asc");
  const [reviewStats, setReviewStats] = useState<Record<string, { avgRating: number; count: number }>>({});
  const [ratingFilter, setRatingFilter] = useState<"all" | "4plus" | "has-reviews">("all");
  const [vendorFilter, setVendorFilter] = useState<"all" | "sinalite" | "scalablepress">("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const { open: showCategories, toggle: toggleCategories } = useToggle(true);

  // Load cached categories from localStorage immediately
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  type CategoryData = {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    icon_emoji: string | null;
    display_order: number;
  };
  const [cachedCategories, setCachedCategories] = useState<CategoryData[]>(() => {
    try {
      const cached = localStorage.getItem('ppp_categories');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>("all");

  useEffect(() => {
    console.log('[Products] Component mounted');
    return () => {
      console.log('[Products] Component unmounting');
    };
  }, []);

  // Fetch categories independently from the database
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id, icon_emoji, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      if (error) {
        console.error('[Products] Categories fetch error:', error);
        // If fetch fails, keep using cached categories
        return;
      }
      
      const categoryData = data || [];
      
      // Update state and cache in localStorage
      setCachedCategories(categoryData);
      localStorage.setItem('ppp_categories', JSON.stringify(categoryData));
      
      console.log('[Products] Categories loaded:', categoryData);
    } catch (e) {
      console.error('[Products] Failed to load categories:', e);
      // Keep using cached categories on error
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setErr(null);
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - please check your connection')), 15000)
    );
    
    try {
      // Fetch pricing settings, products, and review stats in parallel with timeout
      const [settingsResult, productsResult, reviewsResult] = await Promise.race([
        Promise.all([
          withRetry(
            async () => {
              const { data, error } = await supabase
                .from("pricing_settings")
                .select("*")
                .eq("vendor", "sinalite")
                .maybeSingle();
              
              if (error) {
                console.error('[Products] Pricing settings error:', error);
                throw error;
              }
              
              // Return NO markup if none configured - show base price only
              return data || {
                vendor: "sinalite",
                markup_mode: "fixed",
                markup_fixed_cents: 0,
                markup_percent: 0,
                nonprofit_share_mode: "fixed",
                nonprofit_fixed_cents: 0,
                nonprofit_percent_of_markup: 0,
                currency: "USD"
              };
            },
            { maxAttempts: 2, initialDelayMs: 500, maxDelayMs: 2000 }
          ),
          withRetry(
            async () => {
              const { data, error } = await supabase
                .from("products")
                .select("id, name, description, base_cost_cents, min_price_cents, price_override_cents, image_url, category, vendor, markup_fixed_cents, markup_percent, is_active, vendor_product_id, pricing_data")
                .eq("is_active", true)
                .order("category", { ascending: true })
                .order("name", { ascending: true });
              
              if (error) {
                console.error('[Products] Products fetch error:', error);
                throw error;
              }
              return data ?? [];
            },
            { maxAttempts: 2, initialDelayMs: 500, maxDelayMs: 2000 }
          ),
          withRetry(
            async () => {
              const { data, error } = await supabase
                .from("reviews")
                .select("product_id, rating");
              
              if (error) {
                console.error('[Products] Reviews fetch error:', error);
                // Don't fail on reviews error - just return empty array
                return [];
              }
              return data ?? [];
            },
            { maxAttempts: 1, initialDelayMs: 500, maxDelayMs: 1000 }
          )
        ]),
        timeoutPromise
      ] as [Promise<[any, any, any]>, Promise<never>]);
      
      console.log('[Products] Successfully fetched data:', { 
        productsCount: productsResult.length,
        reviewsCount: reviewsResult.length 
      });
      
      // Calculate review statistics for each product
      const stats: Record<string, { avgRating: number; count: number }> = {};
      reviewsResult.forEach((review: any) => {
        if (!stats[review.product_id]) {
          stats[review.product_id] = { avgRating: 0, count: 0 };
        }
        stats[review.product_id].count++;
      });
      
      // Calculate averages
      Object.keys(stats).forEach(productId => {
        const productReviews = reviewsResult.filter((r: any) => r.product_id === productId);
        const sum = productReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
        stats[productId].avgRating = sum / stats[productId].count;
      });
      
      setReviewStats(stats);
      setPricingSettings(settingsResult as PricingSettings);
      setRows(productsResult);
      setLoading(false); // Explicitly set loading to false on success
    } catch (e: any) {
      console.error('[Products] Failed to load products:', e);
      setErr(e?.message || "Failed to load products. Please try again.");
      toast.error("Failed to load products", {
        description: e?.message || "Please check your connection and try again."
      });
      setLoading(false); // Ensure loading is false even on error
    }
  };

  // Sync quantities with cart items
  useEffect(() => {
    const cartQuantities: Record<string, number> = {};
    items.forEach(item => {
      cartQuantities[item.id] = item.quantity;
    });
    setQuantities(cartQuantities);
  }, [items]);

  useEffect(() => {
    document.title = "Products - Print Power Purpose";
    // Fetch categories and products independently
    fetchCategories();
    fetchProducts();
  }, []);

  // Focus search input when navigating from header search icon
  useEffect(() => {
    if (searchParams.get('search') === 'true' && searchInputRef.current) {
      searchInputRef.current.focus();
      setShowSuggestions(true);
    }
  }, [searchParams]);

  // No preloading - base_cost_cents already contains first configuration price from sync

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  const handleAddToCart = (product: ProductRow) => {
    // Track as recently viewed when interacting with product
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

    // Only enforce configuration if product actually requires it
    if (requiresConfiguration && !isConfigured) {
      toast.error("Please configure product options first");
      return;
    }

    const qty = quantities[product.id] || 1;
    
    // Get price based on vendor: SinaLite uses configured price, others use base price
    let unitCents = 0;
    if (product.vendor === "sinalite") {
      unitCents = configuredPrices[product.id] || 0;
      if (!unitCents || unitCents <= 0) {
        toast.error("Please configure product to see pricing");
        return;
      }
    } else {
      // Scalable Press and other vendors: use base_cost_cents directly
      unitCents = product.base_cost_cents || 0;
      if (!unitCents || unitCents <= 0) {
        toast.error("Product price not available");
        return;
      }
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

  const handlePriceChange = (productId: string, priceCents: number) => {
    console.log('[Products] Price changed for product:', productId, 'Price:', priceCents);
    setConfiguredPrices(prev => ({ ...prev, [productId]: priceCents }));
  };

  const handleConfigChange = (productId: string, config: Record<string, string>) => {
    setProductConfigs(prev => ({ ...prev, [productId]: config }));
  };

  const handleQuantityOptionsChange = (productId: string, options: string[]) => {
    console.log('[Products] Quantity options received for product:', productId, options);
    setQuantityOptions(prev => ({ ...prev, [productId]: options }));
  };

  // Generate suggestions based on search term
  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const searchLower = searchTerm.toLowerCase();
    const matches = rows
      .filter(product => 
        product.name.toLowerCase().includes(searchLower) &&
        shouldShowProduct(product)
      )
      .slice(0, 8); // Limit to 8 suggestions
    
    console.log('[Products] Search suggestions:', { searchTerm, matchCount: matches.length, matches: matches.map(m => m.name) });
    return matches;
  }, [searchTerm, rows]);

  // Handle suggestion selection - navigate to product detail page
  const handleSuggestionClick = (product: ProductRow) => {
    setShowSuggestions(false);
    setSuggestionIndex(-1);
    
    // Navigate to product detail page
    const category = product.category?.toLowerCase().replace(/\s+/g, '-') || 'uncategorized';
    const productSlug = product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    navigate(`/products/${category}/${productSlug}`);
  };

  // Handle keyboard navigation in suggestions
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && suggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[suggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSuggestionIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate display prices: SinaLite uses configured prices, other vendors use base_cost_cents
  const defaultPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    rows.forEach(product => {
      // SinaLite products: ONLY use configured prices from API
      if (product.vendor === "sinalite") {
        if (configuredPrices[product.id]) {
          prices[product.id] = configuredPrices[product.id];
        } else {
          prices[product.id] = 0; // Show 0 until configurator loads
        }
      } 
      // Other vendors (Scalable Press, etc.): use base_cost_cents immediately
      else {
        prices[product.id] = product.base_cost_cents || 0;
      }
    });
    return prices;
  }, [rows, configuredPrices]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Filter by search term
    let filtered = searchLower 
      ? rows.filter(product => 
          product.name.toLowerCase().includes(searchLower) ||
          product.category?.toLowerCase().includes(searchLower)
        )
      : rows;
    
    // Exclude Canada products AND Scalable Press products with no images
    filtered = filtered.filter(product => shouldShowProduct(product));
    
    // Apply vendor filter
    if (vendorFilter === "sinalite") {
      filtered = filtered.filter(product => product.vendor === "sinalite");
    } else if (vendorFilter === "scalablepress") {
      filtered = filtered.filter(product => product.vendor === "scalablepress");
    }
    
    // Apply rating filter
    if (ratingFilter === "4plus") {
      filtered = filtered.filter(product => {
        const stats = reviewStats[product.id];
        return stats && stats.avgRating >= 4;
      });
    } else if (ratingFilter === "has-reviews") {
      filtered = filtered.filter(product => {
        const stats = reviewStats[product.id];
        return stats && stats.count > 0;
      });
    }
    
    // Sort products
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      
      if (sortBy === "price-low" || sortBy === "price-high") {
        // Use defaultPrices for sorting
        const priceA = defaultPrices[a.id] || 0;
        const priceB = defaultPrices[b.id] || 0;
        
        return sortBy === "price-low" ? priceA - priceB : priceB - priceA;
      }
      
      if (sortBy === "rating-high") {
        const ratingA = reviewStats[a.id]?.avgRating || 0;
        const ratingB = reviewStats[b.id]?.avgRating || 0;
        
        // Sort by rating descending, then by review count as tiebreaker
        if (ratingA !== ratingB) {
          return ratingB - ratingA;
        }
        return (reviewStats[b.id]?.count || 0) - (reviewStats[a.id]?.count || 0);
      }
      
      if (sortBy === "most-reviewed") {
        const countA = reviewStats[a.id]?.count || 0;
        const countB = reviewStats[b.id]?.count || 0;
        
        return countB - countA;
      }
      
      return 0;
    });
    
    return sorted;
  }, [rows, searchTerm, sortBy, defaultPrices, reviewStats, ratingFilter]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, ProductRow[]> = {};
    
    // If sorting by price, don't group by category - show all products in one list
    if (sortBy === "price-low" || sortBy === "price-high") {
      groups["All Products"] = filteredAndSortedProducts;
    } else {
      // Group by category for name sorting
      filteredAndSortedProducts.forEach(product => {
        const category = product.category || "Uncategorized";
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(product);
      });
    }
    
    return groups;
  }, [filteredAndSortedProducts, sortBy]);


  // Use cached categories (loads instantly) - organized hierarchically
  const categoryData = useMemo(() => {
    return cachedCategories;
  }, [cachedCategories]);

  // Filter by selected category (matches slug but products store category names)
  const categoryFilteredProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") {
      return filteredAndSortedProducts;
    }
    
    // Find the selected category to check if it's a parent
    const selectedCat = cachedCategories.find(c => c.slug === selectedCategory);
    if (!selectedCat) return filteredAndSortedProducts;
    
    // If parent category selected, show all products from child categories
    if (!selectedCat.parent_id) {
      // Get child category NAMES (not slugs) since products store category names
      const childCategoryNames = cachedCategories
        .filter(c => c.parent_id === selectedCat.id)
        .map(c => c.name.toLowerCase());
      
      // Also include the parent category name
      const parentName = selectedCat.name.toLowerCase();
      
      return filteredAndSortedProducts.filter(p => {
        const productCategory = (p.category || "").toLowerCase();
        // Match against parent name, child names, or partial match for inconsistent data
        return productCategory === parentName ||
               childCategoryNames.some(childName => 
                 productCategory === childName || 
                 productCategory.includes(childName.replace(/\s+/g, '')) ||
                 childName.includes(productCategory.replace(/[-\s]+/g, ' ').trim())
               );
      });
    }
    
    // If child category selected, show only products from that category
    // Match by category name (case-insensitive) since products store names not slugs
    const categoryName = selectedCat.name.toLowerCase();
    return filteredAndSortedProducts.filter(p => {
      const productCategory = (p.category || "").toLowerCase();
      return productCategory === categoryName ||
             productCategory.includes(categoryName.replace(/\s+/g, '')) ||
             categoryName.includes(productCategory.replace(/[-\s]+/g, ' ').trim());
    });
  }, [filteredAndSortedProducts, selectedCategory, cachedCategories]);

  // Group products by category
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Calculate pagination
  const totalPages = Math.ceil(categoryFilteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return categoryFilteredProducts.slice(startIndex, endIndex);
  }, [categoryFilteredProducts, currentPage]);

  // Reset to page 1 when filters/search/category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, selectedCategory, ratingFilter, vendorFilter]);

  // Scroll to top when page changes
  useEffect(() => {
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-background">
      <VistaprintNav />
      
      {/* Mega Menu Category Navigation */}
      <ProductMegaMenu
        categories={categoryData}
        onCategorySelect={(slug) => setSelectedCategory(slug)}
        selectedCategory={selectedCategory}
      />

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pb-24">
        <section className="min-h-screen py-16 bg-gray-50">
          <div className="w-full max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {selectedCategory === "all" ? "All Products" : selectedCategory?.replace(/-/g, ' ')}
              </h1>
              <p className="text-gray-600">
                Showing {paginatedProducts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{Math.min(currentPage * ITEMS_PER_PAGE, categoryFilteredProducts.length)} of {categoryFilteredProducts.length} {categoryFilteredProducts.length === 1 ? 'product' : 'products'}
              </p>
            </div>

            {/* Search and Sort Controls */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10 pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setShowSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                {/* Search Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {suggestions.map((product, index) => (
                      <button
                        key={product.id}
                        onClick={() => handleSuggestionClick(product)}
                        className={cn(
                          "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0",
                          index === suggestionIndex && "bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.category}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="price-low">Price (Low to High)</SelectItem>
                  <SelectItem value="price-high">Price (High to Low)</SelectItem>
                  <SelectItem value="rating-high">Rating (High to Low)</SelectItem>
                  <SelectItem value="most-reviewed">Most Reviewed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={ratingFilter} onValueChange={(val: any) => setRatingFilter(val)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="4plus">4+ Stars</SelectItem>
                  <SelectItem value="has-reviews">Has Reviews</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={vendorFilter} onValueChange={(val: any) => setVendorFilter(val)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  <SelectItem value="sinalite">SinaLite</SelectItem>
                  <SelectItem value="scalablepress">Scalable Press</SelectItem>
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
            ) : err ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{err}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No products found</p>
                <Button onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                  setRatingFilter("all");
                  setVendorFilter("all");
                }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 animate-fade-in mb-12">
                  {paginatedProducts.map((product, index) => (
                    <div 
                      key={product.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <ProductCard 
                        product={product}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2 pb-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-full px-6"
                    >
                      ← Previous
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
                      className="rounded-full px-6"
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Recently Viewed Section */}
            <div className="mt-16">
              <RecentlyViewed />
            </div>
          </div>
        </section>
      </div>

      {/* Floating checkout bar */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md bg-black/40 border-t border-white/20">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="text-white">
              <div className="text-sm opacity-80">{count} item(s) in cart</div>
              <div className="text-xl font-semibold">${(totalCents / 100).toFixed(2)}</div>
            </div>
            <Button
              onClick={() => {
                console.log('[Products] Floating cart button clicked - navigating to /cart');
                navigate("/cart");
              }}
              variant="outline"
              size="lg"
              className="rounded-full border-white/50 bg-transparent text-white hover:bg-white/10"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-semibold">View Cart ({count})</span>
                <span className="text-xs opacity-90">${(totalCents / 100).toFixed(2)}</span>
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
