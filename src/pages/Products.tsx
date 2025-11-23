import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import VideoBackground from "@/components/VideoBackground";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, ArrowLeft, Search, X, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { withRetry } from "@/lib/api-retry";
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


export default function Products() {
  const navigate = useNavigate();
  const { add, items, count, totalCents } = useCart();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [configuredPrices, setConfiguredPrices] = useState<Record<string, number>>({});
  const [productConfigs, setProductConfigs] = useState<Record<string, Record<string, string>>>({});
  const [quantityOptions, setQuantityOptions] = useState<Record<string, string[]>>({});
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name-asc" | "price-low" | "price-high">("name-asc");
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
    try {
      // Fetch pricing settings and products in parallel
      const [settingsResult, productsResult] = await Promise.all([
        withRetry(
          async () => {
            const { data, error } = await supabase
              .from("pricing_settings")
              .select("*")
              .eq("vendor", "sinalite")
              .maybeSingle();
            
            if (error) throw error;
            
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
          { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 5000 }
        ),
        withRetry(
          async () => {
            const { data, error } = await supabase
              .from("products")
              .select("id, name, base_cost_cents, price_override_cents, image_url, category, vendor, markup_fixed_cents, markup_percent, is_active, pricing_data, vendor_product_id")
              .eq("is_active", true)
              .order("category", { ascending: true })
              .order("name", { ascending: true })
              .limit(200);
            
            if (error) throw error;
            return data ?? [];
          },
          { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 5000 }
        )
      ]);
      
      setPricingSettings(settingsResult as PricingSettings);
      setRows(productsResult);
    } catch (e: any) {
      console.error('[Products] Failed to load products:', e);
      setErr(e?.message || "Failed to load products. Please try again.");
      toast.error("Failed to load products", {
        description: "Please check your connection and try again."
      });
    } finally {
      setLoading(false);
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

  // Preload default prices for all Sinalite products with pricing_data
  useEffect(() => {
    if (!rows || rows.length === 0) return;

    const preloadPrices = async () => {
      console.log('[Products] Preloading prices for Sinalite products...');
      
      const sinaliteProducts = rows.filter(
        p => p.vendor === 'sinalite' && p.pricing_data && Array.isArray(p.pricing_data) && p.pricing_data.length > 0
      );

      if (sinaliteProducts.length === 0) {
        console.log('[Products] No Sinalite products to preload');
        return;
      }

      console.log('[Products] Found', sinaliteProducts.length, 'Sinalite products to preload');

      // Fetch prices in parallel
      const pricePromises = sinaliteProducts.map(async (product) => {
        try {
          const pricingData = product.pricing_data as any;
          const optionsArray = pricingData[0] || [];
          
          if (!Array.isArray(optionsArray) || optionsArray.length === 0) {
            return null;
          }

          // Group options by group field
          const groupMap: Record<string, any[]> = {};
          optionsArray.forEach((option: any) => {
            if (!option.group) return;
            if (!groupMap[option.group]) {
              groupMap[option.group] = [];
            }
            groupMap[option.group].push(option);
          });

          // Get first option ID from each group (using same sorting as configurator)
          const defaultOptionIds = Object.values(groupMap)
            .map(opts => {
              const sorted = opts.sort((a, b) => {
                const dimensionRegex = /^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)$/;
                const aMatch = a.name.match(dimensionRegex);
                const bMatch = b.name.match(dimensionRegex);
                
                if (aMatch && bMatch) {
                  const aWidth = parseFloat(aMatch[1]);
                  const aHeight = parseFloat(aMatch[2]);
                  const bWidth = parseFloat(bMatch[1]);
                  const bHeight = parseFloat(bMatch[2]);
                  
                  if (aWidth !== bWidth) return aWidth - bWidth;
                  return aHeight - bHeight;
                }
                
                const aNum = parseInt(a.name);
                const bNum = parseInt(b.name);
                
                if (!isNaN(aNum) && !isNaN(bNum)) {
                  return aNum - bNum;
                }
                
                return a.name.localeCompare(b.name);
              });
              return sorted[0]?.id;
            })
            .filter(Boolean);

          if (defaultOptionIds.length === 0) return null;

          const variantKey = defaultOptionIds.sort((a, b) => a - b).join('-');
          
          // Check cache first
          const cacheKey = `price-${product.vendor_product_id}-${variantKey}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            try {
              const { price, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < 60 * 60 * 1000) { // 1 hour cache
                console.log('[Products] Using cached price for', product.name);
                return { productId: product.id, price };
              }
            } catch (e) {
              sessionStorage.removeItem(cacheKey);
            }
          }

          // Fetch price from API
          console.log('[Products] Fetching price for', product.name, 'variant:', variantKey);
          const { data: priceData, error: priceError } = await supabase.functions.invoke('sinalite-price', {
            body: {
              productId: product.vendor_product_id,
              storeCode: 9,
              variantKey: variantKey,
              method: 'PRICEBYKEY'
            },
          });

          if (priceError || !priceData || !Array.isArray(priceData) || priceData.length === 0 || !priceData[0].price) {
            console.warn('[Products] No price returned for', product.name);
            return null;
          }

          const priceFloat = parseFloat(priceData[0].price);
          const priceCents = Math.round(priceFloat * 100);

          // Cache the result
          sessionStorage.setItem(cacheKey, JSON.stringify({
            price: priceCents,
            timestamp: Date.now()
          }));

          console.log('[Products] Preloaded price for', product.name, ':', priceCents);
          return { productId: product.id, price: priceCents };
        } catch (err) {
          console.error('[Products] Failed to preload price for', product.name, err);
          return null;
        }
      });

      const results = await Promise.all(pricePromises);
      
      // Update configured prices with preloaded values
      const newPrices: Record<string, number> = {};
      results.forEach(result => {
        if (result && result.price) {
          newPrices[result.productId] = result.price;
        }
      });

      if (Object.keys(newPrices).length > 0) {
        console.log('[Products] Successfully preloaded', Object.keys(newPrices).length, 'prices');
        setConfiguredPrices(prev => ({ ...prev, ...newPrices }));
      }
    };

    preloadPrices();
  }, [rows]);

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  const handleAddToCart = (product: ProductRow) => {
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
    
    // MUST use configured price from API for Sinalite products
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

  // Calculate display prices: use configured price if available, otherwise 0 for Sinalite products requiring configuration
  const defaultPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    rows.forEach(product => {
      // Check if product has configured price
      if (configuredPrices[product.id]) {
        prices[product.id] = configuredPrices[product.id];
      } else if (product.price_override_cents) {
        prices[product.id] = product.price_override_cents;
      } else if (product.vendor === "sinalite" && product.pricing_data) {
        // Sinalite products with pricing_data require configuration - don't show price until configured
        prices[product.id] = 0;
      } else if (product.vendor === "sinalite" && pricingSettings) {
        // Sinalite products without pricing_data can use base cost
        const pricing = computeGlobalPricing({
          vendor: "sinalite",
          base_cost_cents: product.base_cost_cents || 0,
          settings: pricingSettings
        });
        prices[product.id] = pricing.final_price_per_unit_cents;
      } else {
        prices[product.id] = product.base_cost_cents || 0;
      }
    });
    return prices;
  }, [rows, pricingSettings, configuredPrices]);

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
      
      return 0;
    });
    
    // Log sorted results for debugging price sort
    if (sortBy === "price-low" || sortBy === "price-high") {
      console.log('[Products] Sorted by price:', sorted.slice(0, 10).map(p => ({
        name: p.name,
        price: `$${((defaultPrices[p.id] || 0) / 100).toFixed(2)}`
      })));
    }
    
    return sorted;
  }, [rows, searchTerm, sortBy, defaultPrices]);

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


  return (
    <div className="fixed inset-0 text-white">{/* Removed z-40 to work with App animation wrapper */}
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10 relative">
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

        {/* Center: Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          SELECT PRODUCTS
        </h1>

        {/* Right: Cart button */}
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
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16 pb-24">
        <section className="relative min-h-screen py-12">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-7xl mx-auto px-6 pt-6">
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
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Clear Filters Button */}
                {(searchTerm || sortBy !== "name-asc") && (
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setSortBy("name-asc");
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
                {Object.entries(groupedProducts).map(([category, products]) => (
                  <div key={category} className="space-y-6">
                    <h2 className="text-3xl font-bold text-white uppercase tracking-wider border-b border-white/20 pb-3">
                      {category}
                    </h2>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
                      {products.map((product) => {
                        // All SinaLite products require configuration - they support dynamic options
                        const requiresConfiguration = product.vendor === "sinalite";
                        
                        // Show configured price if available, otherwise show default price instantly
                        const displayPriceCents = configuredPrices[product.id] || defaultPrices[product.id] || 0;
                        
                        const qty = quantities[product.id] || 0;
                        const isConfigured = !!configuredPrices[product.id];
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
