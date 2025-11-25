import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { invokeWithRetry } from "@/lib/api-retry";

type ProductOption = {
  id: number;
  group: string;
  name: string;
};

type OptionGroup = {
  group: string;
  options: ProductOption[];
};

type PackageInfo = {
  "total weight"?: string;
  "weight per box"?: string;
  "Units Per Box"?: string;
  "box size"?: string;
  "number of boxes"?: string;
};

type ProductConfiguratorProps = {
  productId: string;
  vendorProductId: string;
  storeCode: number;
  pricingData: any;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
  onPackageInfoChange?: (info: PackageInfo | null) => void;
  onQuantityOptionsChange?: (options: string[]) => void;
  onVariantKeyChange?: (variantKey: string) => void;
};

export function ProductConfigurator({
  productId,
  vendorProductId,
  storeCode,
  pricingData,
  onPriceChange,
  onConfigChange,
  onPackageInfoChange,
  onQuantityOptionsChange,
  onVariantKeyChange,
}: ProductConfiguratorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [userInteracted, setUserInteracted] = useState(false); // Track if user has manually changed options
  
  // Global price cache in sessionStorage
  const getPriceCache = (): Record<string, number> => {
    try {
      const cached = sessionStorage.getItem('sinalite-price-cache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  };
  
  const setPriceCache = (key: string, value: number) => {
    try {
      const cache = getPriceCache();
      cache[key] = value;
      sessionStorage.setItem('sinalite-price-cache', JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to cache price:', e);
    }
  };

  console.log('[ProductConfigurator] Mounted with:', {
    productId,
    vendorProductId,
    storeCode,
    hasPricingData: !!pricingData,
    pricingDataLength: Array.isArray(pricingData) ? pricingData.length : 'not-array'
  });

  // Parse product options from SinaLite structure
  const optionGroups: OptionGroup[] = useMemo(() => {
    if (!pricingData || !Array.isArray(pricingData)) {
      console.warn('[ProductConfigurator] Invalid pricing data structure');
      return [];
    }
    
    // SinaLite structure: [0] = options array, [1] = combinations, [2] = metadata
    const options: ProductOption[] = pricingData[0] || [];
    
    if (options.length === 0) {
      console.warn('[ProductConfigurator] No options found in pricing data');
      return [];
    }

    // Group options by their "group" field
    const groupMap: Record<string, ProductOption[]> = {};
    options.forEach((option) => {
      if (!option.group) return;
      if (!groupMap[option.group]) {
        groupMap[option.group] = [];
      }
      groupMap[option.group].push(option);
    });

    // Convert to array of groups and sort options within each group
    return Object.entries(groupMap).map(([group, opts]) => ({
      group,
      options: opts.sort((a, b) => {
        // Check if this is a dimension format (e.g., "24×18" or "24x18")
        const dimensionRegex = /^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)$/;
        const aMatch = a.name.match(dimensionRegex);
        const bMatch = b.name.match(dimensionRegex);
        
        if (aMatch && bMatch) {
          // Parse dimensions and sort by first number, then second number
          const aWidth = parseFloat(aMatch[1]);
          const aHeight = parseFloat(aMatch[2]);
          const bWidth = parseFloat(bMatch[1]);
          const bHeight = parseFloat(bMatch[2]);
          
          if (aWidth !== bWidth) {
            return aWidth - bWidth;
          }
          return aHeight - bHeight;
        }
        
        // Try to parse as numbers for QTY fields
        const aNum = parseInt(a.name);
        const bNum = parseInt(b.name);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        
        // Otherwise sort alphabetically
        return a.name.localeCompare(b.name);
      }),
    }));
  }, [pricingData]);

  // Initialize with first option from each group - ONLY RUN ONCE
  useEffect(() => {
    if (optionGroups.length === 0) {
      console.log('[ProductConfigurator] No option groups available');
      return;
    }

    const initial: Record<string, number> = {};
    optionGroups.forEach((group) => {
      if (group.options.length > 0) {
        initial[group.group] = group.options[0].id;
      }
    });

    console.log('[ProductConfigurator] Initialized selections:', initial);
    setSelectedOptions(initial);
    
    // CRITICAL FIX: Immediately notify parent of the initial variant key
    // This enables admin price fields for the default configuration without requiring manual changes
    const optionIds = Object.values(initial);
    if (optionIds.length > 0 && onVariantKeyChange) {
      const variantKey = optionIds.sort((a, b) => a - b).join('-');
      console.log('[ProductConfigurator] Initial variant key set:', variantKey);
      onVariantKeyChange(variantKey);
    }
    
    // Also notify parent of the initial config
    const configUpdate = Object.fromEntries(
      Object.entries(initial).map(([g, oId]) => {
        const name = optionGroups
          .find(og => og.group === g)
          ?.options.find(o => o.id === oId)?.name || String(oId);
        return [g, name];
      })
    );
    console.log('[ProductConfigurator] Initial config set:', configUpdate);
    onConfigChange(configUpdate);
    
    // Mark as user-interacted after initial setup to enable first price fetch
    setTimeout(() => {
      setUserInteracted(true);
    }, 100);
  }, [optionGroups, onVariantKeyChange, onConfigChange]);

  // Notify parent of quantity options - separate effect
  useEffect(() => {
    if (!onQuantityOptionsChange || optionGroups.length === 0) return;
    
    const qtyGroup = optionGroups.find(g => 
      g.group.toLowerCase().includes('qty') || 
      g.group.toLowerCase().includes('quantity')
    );
    if (qtyGroup) {
      const qtyOptions = qtyGroup.options.map(opt => opt.name);
      console.log('[ProductConfigurator] Quantity options:', qtyOptions);
      onQuantityOptionsChange(qtyOptions);
    }
  }, [optionGroups]);

  // Fetch price whenever selections change
  useEffect(() => {
    const optionIds = Object.values(selectedOptions);
    
    console.log('[ProductConfigurator] Price fetch check:', {
      optionIdsLength: optionIds.length,
      optionGroupsLength: optionGroups.length,
      optionIds,
      selectedOptions,
      vendorProductId
    });
    
    // CRITICAL: Validate vendorProductId before any API calls
    if (!vendorProductId || vendorProductId === 'null' || vendorProductId === 'undefined') {
      console.error('[ProductConfigurator] Invalid vendorProductId:', vendorProductId);
      setPriceError('Product configuration unavailable');
      return;
    }
    
    // CRITICAL: Block all API calls if we have no selections at all
    if (optionIds.length === 0) {
      console.log('[ProductConfigurator] Skipping price fetch: no option IDs selected yet');
      return;
    }
    
    // CRITICAL: Don't fetch if there are no option groups at all
    if (optionGroups.length === 0) {
      console.log('[ProductConfigurator] Skipping price fetch: no option groups available');
      return;
    }
    
    // Only fetch if we have selections for all groups
    if (optionIds.length !== optionGroups.length) {
      console.log('[ProductConfigurator] Skipping price fetch: not all groups selected');
      return;
    }
    if (optionIds.some(id => !id)) {
      console.log('[ProductConfigurator] Skipping price fetch: some IDs are falsy');
      return;
    }

    const fetchPrice = async () => {
      const variantKey = optionIds.sort((a, b) => a - b).join('-');
      
      console.log('[ProductConfigurator] ===== PRICE FETCH START =====');
      console.log('[ProductConfigurator] Variant key:', variantKey);
      console.log('[ProductConfigurator] Vendor product ID:', vendorProductId);
      console.log('[ProductConfigurator] Store code:', storeCode);
      console.log('[ProductConfigurator] Option IDs:', optionIds);
      
      // CRITICAL: Prevent API call with empty variantKey
      if (!variantKey || variantKey.trim() === '') {
        console.log('[ProductConfigurator] Skipping price fetch: empty variantKey');
        return;
      }
      
      // Notify parent of variant key change
      if (onVariantKeyChange) {
        onVariantKeyChange(variantKey);
      }
      
      // PRIORITY 1: Check for custom price in database
      console.log('[ProductConfigurator] Checking for custom price:', { productId, variantKey });
      try {
        const { data: customPrice, error: customPriceError } = await supabase
          .from('product_configuration_prices')
          .select('custom_price_cents')
          .eq('product_id', productId)
          .eq('variant_key', variantKey)
          .maybeSingle();
        
        if (customPriceError) {
          console.error('[ProductConfigurator] Error checking custom price:', customPriceError);
        } else if (customPrice && customPrice.custom_price_cents > 0) {
          console.log('[ProductConfigurator] Using custom price from database:', customPrice.custom_price_cents);
          setPriceError(null);
          setFetchingPrice(false);
          onPriceChange(customPrice.custom_price_cents);
          return;
        }
      } catch (err) {
        console.error('[ProductConfigurator] Exception checking custom price:', err);
      }
      
      // PRIORITY 2: Check global cache
      const cache = getPriceCache();
      if (cache[variantKey]) {
        console.log('[ProductConfigurator] Using cached price for:', variantKey);
        setPriceError(null); // Clear any previous errors when using cached price
        setFetchingPrice(false);
        onPriceChange(cache[variantKey]);
        return;
      }
      
      // PRIORITY 3: Fetch from API
      setFetchingPrice(true);
      setPriceError(null);
      console.log('[ProductConfigurator] Calling sinalite-price edge function...');
      console.log('[ProductConfigurator] Request body:', {
        productId: vendorProductId,
        storeCode: storeCode,
        variantKey: variantKey,
        method: 'PRICEBYKEY'
      });
      
      // Fetch from Sinalite API with retry logic for resilience
      try {
        const startTime = Date.now();
        console.log('[ProductConfigurator] invokeWithRetry starting...');
        
        const { data, error } = await invokeWithRetry(
          supabase,
          'sinalite-price',
          {
            body: {
              productId: vendorProductId,
              storeCode: storeCode,
              variantKey: variantKey,
              method: 'PRICEBYKEY'
            },
          },
          {
            maxAttempts: 2,
            initialDelayMs: 500,
            shouldRetry: (err: any) => {
              // Don't retry on 4xx errors (except 429 rate limit)
              if (err?.status >= 400 && err?.status < 500 && err?.status !== 429) {
                return false;
              }
              // Retry on 503 Service Unavailable
              return err?.status === 503 || err?.status >= 500;
            }
          }
        );
        
        const endTime = Date.now();
        console.log('[ProductConfigurator] invokeWithRetry completed in', endTime - startTime, 'ms');
        console.log('[ProductConfigurator] Response data:', data);
        console.log('[ProductConfigurator] Response error:', error);

        if (error) {
          console.error('[ProductConfigurator] Price fetch error:', error);
          console.error('[ProductConfigurator] Error details:', {
            message: error.message,
            status: error.status,
            vendorProductId,
            variantKey,
            storeCode
          });
          
          // User-friendly error messages with more context
          if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
            setPriceError('Pricing service temporarily unavailable. Please try again in a moment.');
          } else if (error.message?.includes('Network connection lost') || error.message?.includes('Failed to fetch')) {
            setPriceError('Connection issue. Please check your internet and try again.');
          } else if (error.message?.includes('Invalid productId')) {
            setPriceError('Product configuration error. Please contact support.');
            console.error('[ProductConfigurator] Invalid vendor product ID:', vendorProductId);
          } else {
            setPriceError(`Unable to load price${error.message ? ': ' + error.message : ''}`);
          }
          
          setFetchingPrice(false);
          return;
        }

        // CRITICAL: Clear error state FIRST before processing valid price
        if (data && Array.isArray(data) && data.length > 0 && data[0].price) {
          const priceFloat = parseFloat(data[0].price);
          const priceCents = Math.round(priceFloat * 100);
          console.log('[ProductConfigurator] Price received:', priceCents);
          
          // Clear error IMMEDIATELY when valid price received
          setPriceError(null);
          setFetchingPrice(false);
          
          setPriceCache(variantKey, priceCents);
          onPriceChange(priceCents);
          
          if (onPackageInfoChange) {
            onPackageInfoChange(null);
          }
          
          console.log('[ProductConfigurator] Error state cleared, price updated');
          return; // Exit early to prevent further processing
        } else {
          console.warn('[ProductConfigurator] No price in response:', data);
          setPriceError('Price not available for this configuration');
          setFetchingPrice(false);
        }
      } catch (err: any) {
        console.error('[ProductConfigurator] Price fetch exception:', err);
        console.error('[ProductConfigurator] Exception details:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
          vendorProductId,
          variantKey,
          storeCode
        });
        
        // Handle caught exceptions with user-friendly messages
        if (err?.message?.includes('503') || err?.message?.includes('Service Unavailable')) {
          setPriceError('Pricing service temporarily down. Please try again shortly.');
        } else if (err?.message?.includes('Network') || err?.message?.includes('fetch')) {
          setPriceError('Connection problem. Please check your internet.');
        } else if (err?.message?.includes('timeout')) {
          setPriceError('Price request timed out. Please try again.');
        } else {
          setPriceError(`Error loading price${err?.message ? ': ' + err.message : ''}`);
        }
        setFetchingPrice(false);
      }
    };

    fetchPrice();
  }, [selectedOptions, optionGroups.length, vendorProductId, storeCode, onPriceChange, onPackageInfoChange, userInteracted]); // Added userInteracted

  const handleOptionChange = (group: string, optionId: string) => {
    console.log('[ProductConfigurator] handleOptionChange called:', { group, optionId });
    
    // Mark that user has interacted - enables price fetching
    setUserInteracted(true);
    
    const id = parseInt(optionId, 10);
    if (isNaN(id)) {
      console.error('[ProductConfigurator] Invalid option ID:', optionId);
      return;
    }
    
    // Update selected options immediately
    setSelectedOptions((prev) => {
      const updated = {
        ...prev,
        [group]: id,
      };
      console.log('[ProductConfigurator] Updated selections:', updated);
      
      // Update config for parent with the new selection
      const configUpdate = Object.fromEntries(
        Object.entries(updated).map(([g, oId]) => {
          const name = optionGroups
            .find(og => og.group === g)
            ?.options.find(o => o.id === oId)?.name || String(oId);
          return [g, name];
        })
      );
      
      console.log('[ProductConfigurator] Config update:', configUpdate);
      onConfigChange(configUpdate);
      
      return updated;
    });
  };

  // Format group name for display with better readability
  const formatGroupName = (group: string) => {
    // Handle common abbreviations
    const abbreviations: Record<string, string> = {
      'qty': 'Quantity',
      'qtyid': 'Quantity',
      'turnaround': 'Turnaround Time',
      'colour': 'Color',
      'color': 'Color',
      'size': 'Size',
      'material': 'Material',
      'stock': 'Stock Type',
      'coating': 'Coating',
      'finish': 'Finish'
    };
    
    const lowerGroup = group.toLowerCase();
    if (abbreviations[lowerGroup]) {
      return abbreviations[lowerGroup];
    }
    
    return group
      .split(/[-_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (optionGroups.length === 0) {
    return (
      <div className="text-sm text-white/70 space-y-2 p-3 bg-amber-900/20 border border-amber-600/30 rounded">
        <p className="font-semibold">⚠️ Configuration unavailable</p>
        <p className="text-xs">This product's pricing data doesn't include configurable options.</p>
        <p className="text-xs">The product can still be ordered at the base price shown above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full p-4 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Product Configuration</h3>
        {fetchingPrice && (
          <div className="flex items-center gap-1 text-xs text-white/60">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Updating price...</span>
          </div>
        )}
        {!fetchingPrice && priceError && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="w-3 h-3" />
            <span>{priceError}</span>
          </div>
        )}
      </div>
      
      {optionGroups.map((group) => {
        const currentValue = selectedOptions[group.group];
        const stringValue = currentValue ? String(currentValue) : "";
        
        return (
          <div key={group.group} className="space-y-2">
            <label htmlFor={group.group} className="block text-foreground font-semibold text-sm mb-1">
              {formatGroupName(group.group)}
            </label>
            <Select
              value={stringValue}
              onValueChange={(value) => {
                console.log('[ProductConfigurator] Option selected:', { 
                  group: group.group, 
                  newValue: value,
                  oldValue: stringValue
                });
                handleOptionChange(group.group, value);
              }}
            >
              <SelectTrigger
                id={group.group}
                className="w-full bg-white text-black border-white/20 focus:ring-2 focus:ring-white/40"
              >
                <SelectValue placeholder={`Select ${formatGroupName(group.group)}`} />
              </SelectTrigger>
              <SelectContent className="bg-white text-black z-[100] max-h-[300px]">
                {group.options.map((option) => (
                  <SelectItem
                    key={option.id}
                    value={String(option.id)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
