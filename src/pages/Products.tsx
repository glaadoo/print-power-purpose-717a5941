import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import VideoBackground from "@/components/VideoBackground";
import ProductCard from "@/components/ProductCard";
import RecentlyViewed from "@/components/RecentlyViewed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, ArrowLeft, Search, X, SlidersHorizontal, Heart } from "lucide-react";
import { toast } from "sonner";
import { withRetry } from "@/lib/api-retry";
import { computeGlobalPricing, type PricingSettings } from "@/lib/global-pricing";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import { cn } from "@/lib/utils";

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[Products] Component mounted');
    return () => {
      console.log('[Products] Component unmounting');
    };
  }, []);

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
                .select("id, name, description, base_cost_cents, price_override_cents, image_url, category, vendor, markup_fixed_cents, markup_percent, is_active, pricing_data, vendor_product_id")
                .eq("is_active", true)
                .order("category", { ascending: true })
                .order("name", { ascending: true })
                .limit(200);
              
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
    fetchProducts();
  }, []);

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
        !product.name.toLowerCase().includes('canada')
      )
      .slice(0, 8); // Limit to 8 suggestions
    
    console.log('[Products] Search suggestions:', { searchTerm, matchCount: matches.length, matches: matches.map(m => m.name) });
    return matches;
  }, [searchTerm, rows]);

  // Handle suggestion selection
  const handleSuggestionClick = (productName: string) => {
    setSearchTerm(productName);
    setShowSuggestions(false);
    setSuggestionIndex(-1);
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
      handleSuggestionClick(suggestions[suggestionIndex].name);
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
    
    // Exclude Canada products
    filtered = filtered.filter(product => !product.name.toLowerCase().includes('canada'));
    
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


  // Extract unique categories for menu
  const categories = useMemo(() => {
    const cats = new Set<string>();
    rows.forEach(product => {
      if (product.category && !product.name.toLowerCase().includes('canada')) {
        cats.add(product.category);
      }
    });
    return Array.from(cats).sort();
  }, [rows]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter by selected category
  const categoryFilteredProducts = useMemo(() => {
    if (!selectedCategory) return filteredAndSortedProducts;
    return filteredAndSortedProducts.filter(p => p.category === selectedCategory);
  }, [filteredAndSortedProducts, selectedCategory]);

  // Group products by category
  const finalGroupedProducts = useMemo(() => {
    const groups: Record<string, ProductRow[]> = {};
    
    // If sorting by price, don't group by category - show all products in one list
    if (sortBy === "price-low" || sortBy === "price-high") {
      groups["All Products"] = categoryFilteredProducts;
    } else {
      // Group by category for name sorting
      categoryFilteredProducts.forEach(product => {
        const category = product.category || "Uncategorized";
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(product);
      });
    }
    
    return groups;
  }, [categoryFilteredProducts, sortBy]);

  return (
    <div className="fixed inset-0 text-white">{/* Removed z-40 to work with App animation wrapper */}
      {/* Top Mission Banner */}
      <div className="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-primary/90 to-primary-foreground/90 backdrop-blur text-white py-2 text-center text-sm font-medium">
        Print Power Purpose - Every Order Supports a Cause
      </div>

  {/* Category Navigation Menu */}
      <nav className="fixed top-10 inset-x-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-2 py-3 justify-center">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                !selectedCategory 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All Products
            </button>
            {categories.map(cat => {
              const categoryProducts = rows.filter(p => p.category === cat && !p.name.toLowerCase().includes('canada'));
              return (
                <div 
                  key={cat}
                  className="relative group"
                >
                  <button
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    onMouseEnter={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {cat}
                  </button>
                  
                  {/* Hover Dropdown */}
                  {selectedCategory === cat && categoryProducts.length > 0 && (
                    <div 
                      className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto bg-background/95 backdrop-blur border border-border rounded-xl shadow-2xl z-[60]"
                      onMouseLeave={() => setSelectedCategory(null)}
                    >
                      {categoryProducts.slice(0, 10).map(product => {
                        const categorySlug = cat.toLowerCase().replace(/\s+/g, '-');
                        const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        return (
                          <button
                            key={product.id}
                            onClick={() => navigate(`/product/${categorySlug}/${productSlug}`, { state: { productId: product.id } })}
                            className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/50 last:border-b-0 flex items-center gap-3"
                          >
                            {product.image_url && (
                              <img src={product.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                ${((defaultPrices[product.id] || product.base_cost_cents) / 100).toFixed(2)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Top bar with search and filters */}
      <header className="fixed top-28 inset-x-0 z-40 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        {/* Left: Back button */}
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Right: Wishlist and Cart buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/favorites")}
            className="rounded-full border-white/50 bg-white/10 text-white hover:bg-white/20 relative"
          >
            <Heart className="w-4 h-4" />
            {favoritesCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('[Products] Header cart button clicked - navigating to /cart');
              navigate("/cart");
            }}
            className="rounded-full border-white/50 bg-white/10 text-white hover:bg-white/20 relative flex items-center gap-2 pr-4"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4" />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-semibold">{count} items</span>
              <span className="text-[10px] opacity-90">${(totalCents / 100).toFixed(2)}</span>
            </div>
          </Button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-44 pb-24">
        <section className="relative min-h-screen py-12">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-7xl mx-auto px-6 pt-6">
            {/* Recently Viewed Section */}
            <RecentlyViewed />

            {/* Search and Sort Controls */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto">
                {/* Search with Suggestions */}
                <div className="relative flex-1" ref={searchRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder="Search products by name or category..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                      setSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      if (searchTerm && suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-10 bg-background/10 backdrop-blur border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                      {suggestions.map((product, index) => (
                        <button
                          key={product.id}
                          onClick={() => handleSuggestionClick(product.name)}
                          className={`w-full px-4 py-3 text-left transition-colors ${
                            index === suggestionIndex
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white'
                              : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="font-medium text-sm">{product.name}</div>
                          {product.category && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{product.category}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Sort with Filter Icon */}
                <div className="relative w-full sm:w-[200px]">
                  <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none z-10" />
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="pl-10 bg-background/10 backdrop-blur border-white/20 text-white focus:ring-white/30">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="rating-high">Highest Rated</SelectItem>
                      <SelectItem value="most-reviewed">Most Reviewed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Clear Filters Button */}
                {(searchTerm || sortBy !== "name-asc" || ratingFilter !== "all") && (
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setSortBy("name-asc");
                      setRatingFilter("all");
                    }}
                    variant="outline"
                    size="default"
                    className="bg-background/10 border-white/20 text-white hover:bg-white/20 gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Rating Filter Pills */}
              <div className="flex flex-wrap gap-3 max-w-3xl mx-auto mt-4">
                <button
                  onClick={() => setRatingFilter("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    ratingFilter === "all"
                      ? "bg-white text-black"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  All Products
                </button>
                <button
                  onClick={() => setRatingFilter("4plus")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    ratingFilter === "4plus"
                      ? "bg-white text-black"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  ⭐ 4+ Stars
                </button>
                <button
                  onClick={() => setRatingFilter("has-reviews")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    ratingFilter === "has-reviews"
                      ? "bg-white text-black"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  Has Reviews
                </button>
              </div>
            </div>
            {loading && <p className="text-center text-xl">Loading products…</p>}
            {err && (
              <div className="border border-red-400/50 bg-red-900/30 text-white p-6 rounded-xl max-w-2xl mx-auto space-y-4">
                <p className="text-center">{err}</p>
                <div className="flex justify-center">
                  <Button
                    onClick={fetchProducts}
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {!loading && !err && (
              <div className="space-y-12">
                {Object.entries(finalGroupedProducts).map(([category, products]) => (
                  <div key={category} className="space-y-6">
                    <h2 className="text-3xl font-bold text-white uppercase tracking-wider border-b border-white/20 pb-3">
                      {category}
                    </h2>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
                      {products.map((product) => {
                        // SinaLite products require configuration, Scalable Press products do not
                        const requiresConfiguration = product.vendor === "sinalite";
                        
                        // Show configured price if available, otherwise show default price instantly
                        const displayPriceCents = configuredPrices[product.id] || defaultPrices[product.id] || 0;
                        
                        const qty = quantities[product.id] || 0;
                        
                        // For SinaLite: need configured price. For Scalable Press: just need base price
                        const isConfigured = product.vendor === "scalablepress" 
                          ? displayPriceCents > 0 
                          : !!configuredPrices[product.id];
                        
                        // Can add to cart if configured and has quantity
                        const canAddToCart = isConfigured && qty > 0;
                        const isInCart = items.some(item => item.id === product.id);

                        return (
                          <ProductCard
                            key={product.id}
                            product={product}
                            displayPriceCents={displayPriceCents}
                            quantity={qty}
                            quantityOptions={quantityOptions[product.id] || []}
                            isInCart={isInCart}
                            requiresConfiguration={requiresConfiguration}
                            isConfigured={isConfigured}
                            canAddToCart={canAddToCart}
                            onQuantityChange={updateQuantity}
                            onAddToCart={handleAddToCart}
                            onPriceChange={handlePriceChange}
                            onConfigChange={handleConfigChange}
                            onQuantityOptionsChange={handleQuantityOptionsChange}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    </div>
  );
}
