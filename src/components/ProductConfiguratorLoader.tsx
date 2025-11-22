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
}

export default function ProductConfiguratorLoader({
  productId,
  onPriceChange,
  onConfigChange,
  onQuantityOptionsChange,
}: LoaderProps) {
  const [productData, setProductData] = useState<any | null>(null);
  const [pricingOptions, setPricingOptions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const fetchPricingOptions = async () => {
    if (pricingOptions || loading) return;
    
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
          return;
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First, get product metadata including pricing_data from sync
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("vendor_product_id, vendor, pricing_data")
        .eq("id", productId)
        .maybeSingle();
      
      if (productError) throw productError;
      if (!product) throw new Error("Product not found");
      
      console.log('[ProductConfiguratorLoader] Product data:', product);
      console.log('[ProductConfiguratorLoader] Pricing data available:', !!product.pricing_data);
      
      // Check if product has pricing_data from sync that includes options
      if (product.pricing_data && typeof product.pricing_data === 'object') {
        const pricingData = product.pricing_data as any;
        
        // Check if pricing_data includes options/configurations
        if (pricingData.options || pricingData.configurations || pricingData.attributes) {
          console.log('[ProductConfiguratorLoader] Using options from pricing_data');
          const optionsData = pricingData.options || pricingData.configurations || pricingData.attributes;
          
          if (Array.isArray(optionsData) && optionsData.length > 0) {
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
              console.log('[ProductConfiguratorLoader] Fetching default price for variant:', variantKey);
              
              supabase.functions.invoke('sinalite-price', {
                body: {
                  productId: product.vendor_product_id,
                  storeCode: 9,
                  variantKey: variantKey,
                  method: 'PRICEBYKEY'
                },
              }).then(({ data: priceData, error: priceError }) => {
                if (!priceError && priceData && Array.isArray(priceData) && priceData.length > 0 && priceData[0].price) {
                  const priceFloat = parseFloat(priceData[0].price);
                  const priceCents = Math.round(priceFloat * 100);
                  console.log('[ProductConfiguratorLoader] Default price fetched:', priceCents);
                  onPriceChange(priceCents);
                }
              }).catch(err => {
                console.error('[ProductConfiguratorLoader] Failed to fetch default price:', err);
              });
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
            return;
          }
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
        console.log('[ProductConfiguratorLoader] Fetching default price for variant:', variantKey);
        
        // Fetch default price immediately
        try {
          const { data: priceData, error: priceError } = await supabase.functions.invoke('sinalite-price', {
            body: {
              productId: product.vendor_product_id,
              storeCode: 9,
              variantKey: variantKey,
              method: 'PRICEBYKEY'
            },
          });
          
          if (!priceError && priceData && Array.isArray(priceData) && priceData.length > 0 && priceData[0].price) {
            const priceFloat = parseFloat(priceData[0].price);
            const priceCents = Math.round(priceFloat * 100);
            console.log('[ProductConfiguratorLoader] Default price fetched:', priceCents);
            onPriceChange(priceCents);
          }
        } catch (err) {
          console.error('[ProductConfiguratorLoader] Failed to fetch default price:', err);
        }
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch pricing options on mount and always mount configurator
  useEffect(() => {
    setIsMounted(true);
    fetchPricingOptions();
  }, [productId]);

  const handleToggle = () => {
    setVisible(!visible);
  };

  return (
    <div className="w-full space-y-3">
      {/* Always mount configurator immediately for instant price loading */}
      {isMounted && pricingOptions && Array.isArray(pricingOptions) && pricingOptions.length > 0 && productData && (
        <div className={visible ? 'block' : 'hidden'}>
          <ProductConfigurator
            productId={productId}
            vendorProductId={productData.vendor_product_id || productId}
            storeCode={9}
            pricingData={pricingOptions}
            onPriceChange={onPriceChange}
            onConfigChange={onConfigChange}
            onQuantityOptionsChange={onQuantityOptionsChange}
          />
        </div>
      )}
      
      <Button
        type="button"
        variant="outline"
        className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? "Loading..." : visible ? "Hide Options" : "Customize Product"}
      </Button>

      {visible && (
        <div className="w-full space-y-2">
          {loading && <p className="text-sm text-white/80">Loading options…</p>}
          {error && (
            <p className="text-sm text-red-300">Failed to load options: {error}</p>
          )}
          {!loading && !error && !pricingOptions && (
            <p className="text-sm text-white/70">No configuration options available for this product.</p>
          )}
        </div>
      )}
    </div>
  );
}
