import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductConfigurator } from "@/components/ProductConfigurator";
// Removed withRetry import - using direct API calls for speed

interface LoaderProps {
  productId: string;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
  onQuantityOptionsChange?: (options: string[]) => void;
  onVariantKeyChange?: (variantKey: string) => void;
}

export default function ProductConfiguratorLoader({
  productId,
  onPriceChange,
  onConfigChange,
  onQuantityOptionsChange,
  onVariantKeyChange,
}: LoaderProps) {
  const [productData, setProductData] = useState<any | null>(null);
  const [pricingOptions, setPricingOptions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [fetchingRef, setFetchingRef] = useState(false);

  const fetchPricingOptions = async () => {
    console.log('[ProductConfiguratorLoader] fetchPricingOptions called', { 
      pricingOptions: !!pricingOptions, 
      fetching: fetchingRef,
      productId 
    });
    
    // Prevent duplicate fetches
    if (pricingOptions || fetchingRef) {
      console.log('[ProductConfiguratorLoader] Skipping fetch - already loaded or in progress');
      return;
    }
    
    setFetchingRef(true);
    
    // Check sessionStorage cache first
    const cacheKey = `product-options-${productId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 1 hour
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          console.log('[ProductConfiguratorLoader] Using cached options');
          setPricingOptions(data.pricingOptions);
          setProductData(data.product);
          setLoading(false);
          setFetchingRef(false);
          return;
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }
    
    setError(null);
    setLoading(true); // Start loading when fetch begins
    console.log('[ProductConfiguratorLoader] Starting fetch...');
    
    try {
      // First, get product metadata including pricing_data from sync
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("vendor_product_id, vendor, pricing_data, base_cost_cents")
        .eq("id", productId)
        .maybeSingle();
      
      if (productError) throw productError;
      if (!product) throw new Error("Product not found");
      
      console.log('[ProductConfiguratorLoader] Product data:', product);
      console.log('[ProductConfiguratorLoader] Vendor:', product.vendor);
      console.log('[ProductConfiguratorLoader] Pricing data available:', !!product.pricing_data);
      
      // Handle Scalable Press products separately - they have pricing in pricing_data
      if (product.vendor === 'scalablepress') {
        console.log('[ProductConfiguratorLoader] Scalable Press product detected - using embedded pricing');
        
        // Extract price from pricing_data items
        if (product.pricing_data && typeof product.pricing_data === 'object') {
          const pricingData = product.pricing_data as any;
          
          if (pricingData.items && typeof pricingData.items === 'object') {
            // Get all prices from items
            const prices: number[] = [];
            Object.values(pricingData.items).forEach((colorData: any) => {
              if (typeof colorData === 'object') {
                Object.values(colorData).forEach((sizeData: any) => {
                  if (sizeData && typeof sizeData.price === 'number') {
                    prices.push(sizeData.price);
                  }
                });
              }
            });
            
            if (prices.length > 0) {
              // Use first available price (typically the base price)
              const priceCents = prices[0];
              console.log('[ProductConfiguratorLoader] Found Scalable Press price:', priceCents, 'cents');
              onPriceChange(priceCents);
              setProductData(product);
              setLoading(false);
              setFetchingRef(false);
              return;
            }
          }
        }
        
        // Fallback to base_cost_cents if pricing_data doesn't have prices
        if (product.base_cost_cents > 0) {
          console.log('[ProductConfiguratorLoader] Using base_cost_cents:', product.base_cost_cents);
          onPriceChange(product.base_cost_cents);
          setProductData(product);
          setLoading(false);
          setFetchingRef(false);
          return;
        }
        
        throw new Error("No pricing information available for Scalable Press product");
      }
      
      // CRITICAL: Validate vendor_product_id before proceeding (SinaLite only)
      if (!product.vendor_product_id || product.vendor_product_id === 'null' || product.vendor_product_id === 'undefined') {
        console.error('[ProductConfiguratorLoader] Invalid vendor_product_id:', product.vendor_product_id);
        throw new Error("Product configuration unavailable - missing vendor product ID");
      }
      
      // Check if product has pricing_data from sync that includes options
      if (product.pricing_data && typeof product.pricing_data === 'object') {
        const pricingData = product.pricing_data as any;
        
        // Handle different possible data structures - be more flexible
        let optionsData = null;
        
        // Case 1: Direct array of options
        if (Array.isArray(pricingData) && pricingData.length > 0) {
          // Check if it's [options, combinations, metadata] format
          if (Array.isArray(pricingData[0]) && pricingData[0].length > 0 && pricingData[0][0]?.id && pricingData[0][0]?.group) {
            optionsData = pricingData[0];
            console.log('[ProductConfiguratorLoader] Using nested array format');
          } 
          // Or just a flat array of options
          else if (pricingData[0]?.id && pricingData[0]?.group) {
            optionsData = pricingData;
            console.log('[ProductConfiguratorLoader] Using flat array format');
          }
        } 
        // Case 2: Object with various keys
        else if (pricingData.options && Array.isArray(pricingData.options)) {
          optionsData = pricingData.options;
        } else if (pricingData.configurations && Array.isArray(pricingData.configurations)) {
          optionsData = pricingData.configurations;
        } else if (pricingData.attributes && Array.isArray(pricingData.attributes)) {
          optionsData = pricingData.attributes;
        }
        
        if (optionsData && Array.isArray(optionsData) && optionsData.length > 0) {
          console.log('[ProductConfiguratorLoader] Using options from pricing_data, count:', optionsData.length);
          
          // Format as expected by ProductConfigurator: [options, {}, {}]
          const options = [optionsData, {}, {}];
          setPricingOptions(options);
          setProductData(product);
          
          // Immediately fetch default price (first option from each group)
          const groupMap: Record<string, any[]> = {};
          optionsData.forEach((option: any) => {
            if (!option.group) return;
            if (!groupMap[option.group]) {
              groupMap[option.group] = [];
            }
            groupMap[option.group].push(option);
          });
          
          const defaultOptionIds = Object.values(groupMap)
            .map(opts => opts[0]?.id)
            .filter(Boolean);
          
          if (defaultOptionIds.length > 0) {
            const variantKey = defaultOptionIds.sort((a, b) => a - b).join('-');
            console.log('[ProductConfiguratorLoader] Will fetch default price for variant:', variantKey);
            // Price will be fetched by ProductConfigurator - skip duplicate call
          }
          
          // Cache the result
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              data: { pricingOptions: options, product },
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('[ProductConfiguratorLoader] Failed to cache options:', e);
          }
          setLoading(false);
          setFetchingRef(false);
          return;
        }
      }
      
      // If no options in pricing_data, fetch from SinaLite API
      // Use GET method to retrieve product options
      console.log('[ProductConfiguratorLoader] Fetching options from API for product:', product.vendor_product_id);
      
      // Direct API call without retry wrapper for speed
      const { data: response, error: apiError } = await supabase.functions.invoke('sinalite-price', {
        body: {
          productId: product.vendor_product_id,
          storeCode: 9,
          method: 'GET'
        }
      });
      
      if (apiError) throw apiError;
      
      console.log('[ProductConfiguratorLoader] Received pricing response:', response);
      
      // Check for error response from edge function
      if (response && typeof response === 'object' && 'error' in response) {
        throw new Error(response.error || 'Unknown error from pricing API');
      }
      
      console.log('[ProductConfiguratorLoader] Response structure:', {
        isArray: Array.isArray(response),
        firstElementIsArray: Array.isArray(response?.[0]),
        firstElementLength: Array.isArray(response?.[0]) ? response[0].length : 0,
        sampleFirstOption: response?.[0]?.[0]
      });
      
      // SinaLite API returns: [options[], combinations, metadata]
      // where options[0] = array of {id, group, name} objects
      if (!Array.isArray(response)) {
        throw new Error("Invalid response format: expected array, got " + typeof response);
      }
      
      const optionsArray = response[0];
      
      if (!Array.isArray(optionsArray) || optionsArray.length === 0) {
        throw new Error("No configuration options found in API response");
      }
      
      console.log('[ProductConfiguratorLoader] Found', optionsArray.length, 'options');
      console.log('[ProductConfiguratorLoader] Sample options:', optionsArray.slice(0, 3));
      
      // Pass the full response (not just options) to ProductConfigurator
      setPricingOptions(response);
      setProductData(product);
      
      // Immediately fetch default price (first option from each group)
      const groupMap: Record<string, any[]> = {};
      optionsArray.forEach((option: any) => {
        if (!option.group) return;
        if (!groupMap[option.group]) {
          groupMap[option.group] = [];
        }
        groupMap[option.group].push(option);
      });
      
      // Get first option ID from each group
      const defaultOptionIds = Object.values(groupMap)
        .map(opts => opts.sort((a, b) => {
          // Same sorting logic as ProductConfigurator
          const dimensionRegex = /^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)$/;
          const aMatch = a.name.match(dimensionRegex);
          const bMatch = b.name.match(dimensionRegex);
          
          if (aMatch && bMatch) {
            const aWidth = parseFloat(aMatch[1]);
            const aHeight = parseFloat(aMatch[2]);
            const bWidth = parseFloat(bMatch[1]);
            const bHeight = parseFloat(bMatch[2]);
            
            if (aWidth !== bWidth) {
              return aWidth - bWidth;
            }
            return aHeight - bHeight;
          }
          
          const aNum = parseInt(a.name);
          const bNum = parseInt(b.name);
          
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
          
          return a.name.localeCompare(b.name);
        })[0]?.id)
        .filter(Boolean);
      
      if (defaultOptionIds.length > 0) {
        const variantKey = defaultOptionIds.sort((a, b) => a - b).join('-');
        console.log('[ProductConfiguratorLoader] Will fetch default price for variant:', variantKey);
        // Price will be fetched by ProductConfigurator - skip duplicate call
      }
      
      // Cache the result
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: { pricingOptions: response, product },
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('[ProductConfiguratorLoader] Failed to cache options:', e);
      }
    } catch (e: any) {
      console.error('[ProductConfiguratorLoader] Error fetching pricing options:', e);
      setError(e.message || "Failed to load configuration options");
      
      // Set error price to 0 to clear any loading states
      onPriceChange(0);
    } finally {
      console.log('[ProductConfiguratorLoader] Fetch complete', { 
        hasPricingOptions: !!pricingOptions, 
        hasProductData: !!productData,
        hasError: !!error
      });
      setLoading(false);
      setFetchingRef(false);
    }
  };

  // Mount component and fetch immediately
  useEffect(() => {
    console.log('[ProductConfiguratorLoader] Component mounted for product:', productId);
    setIsMounted(true);
    // Fetch pricing options immediately on mount
    if (!pricingOptions && !fetchingRef) {
      fetchPricingOptions();
    }
  }, [productId]);


  // Debug render
  console.log('[ProductConfiguratorLoader] Render state:', {
    isMounted,
    hasPricingOptions: !!pricingOptions,
    pricingOptionsIsArray: Array.isArray(pricingOptions),
    pricingOptionsLength: Array.isArray(pricingOptions) ? pricingOptions.length : 0,
    hasProductData: !!productData,
    loading,
    error
  });

  return (
    <div className="w-full space-y-3">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-white/80 justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
          <span>Loading configuration...</span>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-300 font-semibold bg-red-900/20 border border-red-600/30 rounded p-3">
          Error: {error}
        </p>
      )}
      
      {!loading && !error && isMounted && pricingOptions && Array.isArray(pricingOptions) && pricingOptions.length > 0 && productData && (
        <ProductConfigurator
          productId={productId}
          vendorProductId={productData.vendor_product_id || productId}
          storeCode={9}
          pricingData={pricingOptions}
          onPriceChange={onPriceChange}
          onConfigChange={onConfigChange}
          onQuantityOptionsChange={onQuantityOptionsChange}
          onVariantKeyChange={onVariantKeyChange}
        />
      )}
      
      {!loading && !error && !pricingOptions && (
        <p className="text-sm text-white/70 bg-white/5 border border-white/10 rounded p-3">
          No configuration options available for this product.
        </p>
      )}
    </div>
  );
}
