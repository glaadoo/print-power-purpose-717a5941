import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  defaultVariantKey?: string | null;
  // CRITICAL: Controlled selection state from parent to persist across remounts
  selectedOptions?: Record<string, number>;
  onSelectedOptionsChange?: (options: Record<string, number>) => void;
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
  defaultVariantKey,
  selectedOptions: controlledSelectedOptions,
  onSelectedOptionsChange,
}: ProductConfiguratorProps) {
  // Use controlled state from parent if provided, otherwise use local state
  const [localSelectedOptions, setLocalSelectedOptions] = useState<Record<string, number>>({});
  const selectedOptions = controlledSelectedOptions ?? localSelectedOptions;
  const setSelectedOptions = (newOptions: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    if (typeof newOptions === 'function') {
      const updated = newOptions(selectedOptions);
      if (onSelectedOptionsChange) {
        onSelectedOptionsChange(updated);
      } else {
        setLocalSelectedOptions(updated);
      }
    } else {
      if (onSelectedOptionsChange) {
        onSelectedOptionsChange(newOptions);
      } else {
        setLocalSelectedOptions(newOptions);
      }
    }
  };
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [userInteracted, setUserInteracted] = useState(false); // Track if user has manually changed options
  const [validOptionsMap, setValidOptionsMap] = useState<Record<string, Set<number>>>({}); // Map of group -> valid option IDs
  const [validatingOptions, setValidatingOptions] = useState(false); // Track validation state  
  const [validationComplete, setValidationComplete] = useState(false); // Track if initial validation is done
  const [customQuantity, setCustomQuantity] = useState<string>("100"); // For variable_qty products
  const [manualPriceFetch, setManualPriceFetch] = useState(0); // Trigger manual price fetch for variable qty
  const lastChangedOptionRef = useRef<{ group: string; optionId: number } | null>(null);
  const initializationDoneRef = useRef(false); // Prevent re-initialization after first load
  
  // Use refs to store callbacks to avoid dependency issues causing stale closures
  const onPriceChangeRef = useRef(onPriceChange);
  const onPackageInfoChangeRef = useRef(onPackageInfoChange);
  const onVariantKeyChangeRef = useRef(onVariantKeyChange);
  const onConfigChangeRef = useRef(onConfigChange);
  
  // Keep refs updated
  useEffect(() => {
    onPriceChangeRef.current = onPriceChange;
    onPackageInfoChangeRef.current = onPackageInfoChange;
    onVariantKeyChangeRef.current = onVariantKeyChange;
    onConfigChangeRef.current = onConfigChange;
  }, [onPriceChange, onPackageInfoChange, onVariantKeyChange, onConfigChange]);
  
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

  // Check if this is a variable quantity product
  // Variable qty = user enters any number in a text input
  // Fixed qty = user selects from dropdown of discrete quantities (100, 250, 500, etc.)
  const isVariableQty = useMemo(() => {
    if (!pricingData || !Array.isArray(pricingData)) {
      return false;
    }
    
    // Check metadata for variable_qty flag
    const metadata = pricingData[2];
    const hasVariableQtyMetadata = Array.isArray(metadata) && 
      metadata.some((m: any) => m?.metadata === 'variable_qty');
    
    if (!hasVariableQtyMetadata) {
      return false;
    }
    
    // Check if qty options look like min/max range vs actual discrete quantities
    const options = pricingData[0] || [];
    const qtyOptions = Array.isArray(options) 
      ? options.filter((opt: any) => opt?.group?.toLowerCase() === 'qty' && !opt.hidden)
      : [];
    
    // If only 2 qty options exist and one is "1" or very small, and other is very large (1000000+),
    // this is a variable qty product with min/max range
    if (qtyOptions.length === 2) {
      const values = qtyOptions.map((opt: any) => parseInt(opt.name) || 0).sort((a, b) => a - b);
      const isMinMaxRange = values[0] <= 10 && values[1] >= 100000;
      if (isMinMaxRange) {
        console.log('[ProductConfigurator] Variable qty detected (min/max range):', values);
        return true;
      }
    }
    
    // If we have multiple discrete qty options (3+), show dropdown even with variable_qty metadata
    if (qtyOptions.length >= 3) {
      console.log('[ProductConfigurator] Fixed qty detected (discrete options):', qtyOptions.length);
      return false;
    }
    
    // Default: use variable qty if metadata says so and we don't have clear discrete options
    return true;
  }, [pricingData]);

  // Note: pricingData[1] contains hash-based combinations, not variant key mappings
  // We cannot pre-filter options from this data structure
  // Instead, we validate options on-demand via API calls

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

  // Initialize with first option from each group - or use defaultVariantKey if provided
  // CRITICAL: Only run ONCE on mount, never re-initialize after user interaction
  useEffect(() => {
    // CRITICAL FIX: Only initialize once - never reset after first initialization
    if (initializationDoneRef.current) {
      console.log('[ProductConfigurator] Skipping re-initialization, already done');
      return;
    }
    
    if (optionGroups.length === 0) {
      console.log('[ProductConfigurator] No option groups available');
      return;
    }

    const initial: Record<string, number> = {};
    
    // If defaultVariantKey is provided, try to pre-select those options
    if (defaultVariantKey) {
      const defaultOptionIds = defaultVariantKey.split('-').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      console.log('[ProductConfigurator] Using defaultVariantKey to initialize:', defaultVariantKey, 'parsed IDs:', defaultOptionIds);
      
      // Map each option ID to its group
      const allOptions = pricingData?.[0] || [];
      const optionIdToGroup: Record<number, string> = {};
      allOptions.forEach((opt: ProductOption) => {
        if (opt.id && opt.group) {
          optionIdToGroup[opt.id] = opt.group;
        }
      });
      
      // Set initial selections from defaultVariantKey
      defaultOptionIds.forEach(optId => {
        const group = optionIdToGroup[optId];
        if (group && !initial[group]) {
          initial[group] = optId;
        }
      });
      
      // Fill in any missing groups with first option
      optionGroups.forEach((group) => {
        if (!initial[group.group] && group.options.length > 0) {
          initial[group.group] = group.options[0].id;
        }
      });
    } else {
      // Default: use first option from each group
      optionGroups.forEach((group) => {
        if (group.options.length > 0) {
          initial[group.group] = group.options[0].id;
        }
      });
    }

    console.log('[ProductConfigurator] Initialized selections:', initial);
    setSelectedOptions(initial);
    
    // Mark initialization as done BEFORE callbacks to prevent re-runs
    initializationDoneRef.current = true;
    
    // CRITICAL FIX: Immediately notify parent of the initial variant key
    // This enables admin price fields for the default configuration without requiring manual changes
    const optionIds = Object.values(initial);
    if (optionIds.length > 0 && onVariantKeyChangeRef.current) {
      const variantKey = optionIds.sort((a, b) => a - b).join('-');
      console.log('[ProductConfigurator] Initial variant key set:', variantKey);
      onVariantKeyChangeRef.current(variantKey);
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
    onConfigChangeRef.current(configUpdate);
    
    // Mark as user-interacted after initial setup to enable first price fetch
    setTimeout(() => {
      setUserInteracted(true);
    }, 100);
  }, [optionGroups, defaultVariantKey, pricingData]);

  // SMART VALIDATION: When a "core" option (size, stock) changes, validate all dependent options
  // Only show options that produce valid prices for the current core configuration
  const prevCoreSelectionsRef = useRef<string>('');
  const validationInProgress = useRef<boolean>(false);
  
  // Identify which groups are "core" (affect other options) vs "dependent"
  const coreGroupNames = useMemo(() => ['size', 'stock', 'Stock', 'qty', 'qtyid', 'Qty', 'QtyId'], []);
  
  const isDependentGroup = useCallback((groupName: string) => {
    const lower = groupName.toLowerCase();
    return !coreGroupNames.some(c => lower === c.toLowerCase() || lower.includes('qty'));
  }, [coreGroupNames]);
  
  // Validate dependent options when core selections change
  useEffect(() => {
    if (!optionGroups.length || !Object.keys(selectedOptions).length) return;
    if (validationInProgress.current) return;
    
    // Build core selection key to detect changes
    const coreSelectionKey = optionGroups
      .filter(g => !isDependentGroup(g.group))
      .map(g => selectedOptions[g.group])
      .filter(Boolean)
      .sort((a, b) => a - b)
      .join('-');
    
    // Skip if core selections haven't changed
    if (prevCoreSelectionsRef.current === coreSelectionKey && validationComplete) {
      return;
    }
    
    prevCoreSelectionsRef.current = coreSelectionKey;
    
    // Get current core option IDs (size, stock, qty)
    const coreOptionIds: number[] = optionGroups
      .filter(g => !isDependentGroup(g.group))
      .map(g => selectedOptions[g.group])
      .filter((id): id is number => !!id);
    
    if (coreOptionIds.length === 0) return;
    
    // Get dependent groups to validate
    const dependentGroups = optionGroups.filter(g => isDependentGroup(g.group));
    if (dependentGroups.length === 0) {
      setValidationComplete(true);
      return;
    }
    
    // Validate all options in dependent groups
    const validateDependentOptions = async () => {
      validationInProgress.current = true;
      setValidatingOptions(true);
      
      console.log('[ProductConfigurator] Starting dependent option validation for core:', coreOptionIds);
      
      const newValidOptionsMap: Record<string, Set<number>> = {};
      
      // Initialize all groups with empty sets
      dependentGroups.forEach(g => {
        newValidOptionsMap[g.group] = new Set<number>();
      });
      
      // Batch validate: for each dependent group, test each option
      for (const group of dependentGroups) {
        const validIds = new Set<number>();
        
        // Build base option IDs (all core + all other dependent groups with their first valid option)
        for (const option of group.options) {
          // Build full configuration: core options + this option + first option from other dependent groups
          const testOptionIds: number[] = [...coreOptionIds, option.id];
          
          // Add first option from other dependent groups
          for (const otherGroup of dependentGroups) {
            if (otherGroup.group !== group.group && otherGroup.options.length > 0) {
              // Use currently selected option or first option
              const selectedId = selectedOptions[otherGroup.group];
              if (selectedId) {
                testOptionIds.push(selectedId);
              } else {
                testOptionIds.push(otherGroup.options[0].id);
              }
            }
          }
          
          const variantKey = testOptionIds.sort((a, b) => a - b).join('-');
          
          try {
            const { data } = await supabase.functions.invoke('sinalite-price', {
              body: {
                productId: vendorProductId,
                storeCode: storeCode,
                variantKey: variantKey,
                method: 'PRICEBYKEY'
              }
            });
            
            // Check if we got a valid price
            if (data && Array.isArray(data) && data.length > 0 && data[0].price) {
              validIds.add(option.id);
            }
          } catch (err) {
            // Option is invalid - don't add to valid set
            console.log(`[ProductConfigurator] Option ${option.name} (${option.id}) invalid for current config`);
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        newValidOptionsMap[group.group] = validIds;
        console.log(`[ProductConfigurator] ${group.group}: ${validIds.size}/${group.options.length} valid options`);
      }
      
      setValidOptionsMap(newValidOptionsMap);
      setValidatingOptions(false);
      setValidationComplete(true);
      validationInProgress.current = false;
      
      // Auto-select first valid option if current selection is invalid
      setSelectedOptions(prev => {
        const updated = { ...prev };
        let changed = false;
        
        for (const group of dependentGroups) {
          const validSet = newValidOptionsMap[group.group];
          const currentSelection = prev[group.group];
          
          if (currentSelection && !validSet.has(currentSelection)) {
            // Current selection is invalid, switch to first valid option
            const firstValid = Array.from(validSet)[0];
            if (firstValid) {
              updated[group.group] = firstValid;
              changed = true;
              console.log(`[ProductConfigurator] Auto-switching ${group.group} from ${currentSelection} to ${firstValid}`);
            }
          }
        }
        
        if (changed) {
          // Update config for parent
          const configUpdate = Object.fromEntries(
            Object.entries(updated).map(([g, oId]) => {
              const name = optionGroups
                .find(og => og.group === g)
                ?.options.find(o => o.id === oId)?.name || String(oId);
              return [g, name];
            })
          );
          onConfigChangeRef.current(configUpdate);
        }
        
        return changed ? updated : prev;
      });
    };
    
    validateDependentOptions();
  }, [selectedOptions, optionGroups, vendorProductId, storeCode, isDependentGroup, validationComplete]);

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

  // Report customQuantity to parent config for variable qty products
  useEffect(() => {
    if (!isVariableQty || !customQuantity) return;
    
    // Find the qty group name
    const qtyGroup = optionGroups.find(g => 
      g.group.toLowerCase().includes('qty') || 
      g.group.toLowerCase().includes('quantity')
    );
    
    if (qtyGroup) {
      // Build full config with custom quantity
      const configUpdate = Object.fromEntries(
        optionGroups.map(group => {
          const isQty = group.group.toLowerCase().includes('qty') || group.group.toLowerCase().includes('quantity');
          if (isQty) {
            return [group.group, customQuantity];
          }
          const optId = selectedOptions[group.group];
          const name = group.options.find(o => o.id === optId)?.name || String(optId);
          return [group.group, name];
        })
      );
      console.log('[ProductConfigurator] Config update with custom qty:', configUpdate);
      onConfigChangeRef.current(configUpdate);
    }
  }, [isVariableQty, customQuantity, optionGroups, selectedOptions]);

  // Fetch price whenever selections change
  useEffect(() => {
    const optionIds = Object.values(selectedOptions);
    
    console.log('[ProductConfigurator] Price fetch check:', {
      optionIdsLength: optionIds.length,
      optionGroupsLength: optionGroups.length,
      optionIds,
      selectedOptions,
      vendorProductId,
      isVariableQty,
      customQuantity
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
    
    // For variable qty products, validate customQuantity is a valid number
    if (isVariableQty) {
      const qty = parseInt(customQuantity);
      if (isNaN(qty) || qty < 1) {
        console.log('[ProductConfigurator] Skipping price fetch: invalid customQuantity', customQuantity);
        return;
      }
    }
    
    // Only fetch if we have selections for all required groups
    if (!isVariableQty && optionIds.length !== optionGroups.length) {
      console.log('[ProductConfigurator] Skipping price fetch: not all groups selected');
      return;
    }
    if (optionIds.some(id => !id)) {
      console.log('[ProductConfigurator] Skipping price fetch: some IDs are falsy');
      return;
    }
    
    // For variable qty products, only fetch when button is clicked (manualPriceFetch changes)
    // For non-variable qty products, fetch immediately when selections change
    const debounceDelay = 0;
    
    const timeoutId = setTimeout(() => {
      console.log('[ProductConfigurator] Executing price fetch, customQuantity:', customQuantity);
      
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
        if (onVariantKeyChangeRef.current) {
          onVariantKeyChangeRef.current(variantKey);
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
            onPriceChangeRef.current(customPrice.custom_price_cents);
            return;
          }
        } catch (err) {
          console.error('[ProductConfigurator] Exception checking custom price:', err);
        }
        
        // PRIORITY 2: Check global cache
        // For variable qty products with manual fetch (button click), SKIP cache to always get fresh prices
        const cache = getPriceCache();
        const cacheKey = isVariableQty && customQuantity ? `${variantKey}-${customQuantity}` : variantKey;
        
        // Skip cache for variable qty products - always fetch fresh when Check Price is clicked
        if (!isVariableQty && cache[cacheKey]) {
          console.log('[ProductConfigurator] Using cached price for:', cacheKey);
          setPriceError(null);
          setFetchingPrice(false);
          onPriceChangeRef.current(cache[cacheKey]);
          return;
        }
        
        // For variable qty, log that we're fetching fresh
        if (isVariableQty) {
          console.log('[ProductConfigurator] Variable qty product - fetching fresh price for:', cacheKey);
        }
        
        // PRIORITY 3: Fetch from API
        setFetchingPrice(true);
        setPriceError(null);
        
        // For variable quantity products, use POST with productOptions
        // For fixed quantity products, use PRICEBYKEY
        const usePost = isVariableQty && customQuantity;
        
        if (usePost) {
          // Build productOptions array with ONLY non-qty option IDs
          const productOptions: number[] = [];
          optionGroups.forEach(group => {
            const isQty = group.group.toLowerCase().includes('qty') || group.group.toLowerCase().includes('quantity');
            if (!isQty) {
              const optId = selectedOptions[group.group];
              if (optId) productOptions.push(optId);
            }
          });
          
          const quantityValue = parseInt(customQuantity) || 100;
          
          console.log('[ProductConfigurator] Calling sinalite-price with POST (variable qty)...');
          console.log('[ProductConfigurator] Request body:', {
            productId: vendorProductId,
            storeCode: storeCode,
            productOptions: productOptions,
            quantity: quantityValue,
            method: 'POST'
          });
          
          try {
            const startTime = Date.now();
            const { data, error } = await invokeWithRetry(
              supabase,
              'sinalite-price',
              {
                body: {
                  productId: vendorProductId,
                  storeCode: storeCode,
                  productOptions: productOptions,
                  quantity: quantityValue,
                  method: 'POST'
                },
              },
              {
                maxAttempts: 2,
                initialDelayMs: 500,
                shouldRetry: (err: any) => err?.status === 503 || err?.status >= 500
              }
            );
            
            const endTime = Date.now();
            console.log('[ProductConfigurator] POST completed in', endTime - startTime, 'ms');
            console.log('[ProductConfigurator] Response:', data);
            
            if (error) {
              console.error('[ProductConfigurator] POST error:', error);
              setPriceError('Error loading price. Please try again.');
              setFetchingPrice(false);
              return;
            }
            
            // POST response may have different structure - check for price
            let priceValue = null;
            if (data && typeof data === 'object') {
              if (data.price !== undefined) {
                priceValue = parseFloat(data.price);
              } else if (Array.isArray(data) && data[0]?.price !== undefined) {
                priceValue = parseFloat(data[0].price);
              } else if (data.total !== undefined) {
                priceValue = parseFloat(data.total);
              }
            }
            
            if (priceValue && priceValue > 0) {
              // SinaLite API returns PER-UNIT price (ignores qty parameter in response)
              // We must multiply by requested quantity to get total
              const qty = parseInt(customQuantity) || 1;
              const perUnitCents = Math.round(priceValue * 100);
              const priceCents = perUnitCents * qty;
              console.log('[ProductConfigurator] Variable qty price calculation:', {
                apiPrice: priceValue,
                perUnitCents,
                requestedQty: qty,
                totalPriceCents: priceCents
              });
              setPriceError(null);
              onPriceChangeRef.current(priceCents);
              setPriceCache(`${variantKey}-${customQuantity}`, priceCents);
            } else {
              console.warn('[ProductConfigurator] No price in POST response:', data);
              setPriceError('Price unavailable for this quantity. Try a different amount.');
            }
            setFetchingPrice(false);
            return;
          } catch (err: any) {
            console.error('[ProductConfigurator] POST exception:', err);
            setPriceError('Error loading price. Please try again.');
            setFetchingPrice(false);
            return;
          }
        }
        
        console.log('[ProductConfigurator] Calling sinalite-price edge function...');
        console.log('[ProductConfigurator] Request body:', {
          productId: vendorProductId,
          storeCode: storeCode,
          variantKey: variantKey,
          method: 'PRICEBYKEY'
        });
        
        // Fetch from Sinalite API with retry logic
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
                if (err?.status >= 400 && err?.status < 500 && err?.status !== 429) {
                  return false;
                }
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
            
            if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
              setPriceError('Pricing service temporarily unavailable. Please try again in a moment.');
            } else if (error.message?.includes('Network connection lost') || error.message?.includes('Failed to fetch')) {
              setPriceError('Connection issue. Please check your internet and try again.');
            } else if (error.message?.includes('Invalid productId')) {
              setPriceError('Product configuration error. Please contact support.');
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
            
            setPriceError(null);
            setFetchingPrice(false);
            
            setPriceCache(variantKey, priceCents);
            onPriceChangeRef.current(priceCents);
            
            if (onPackageInfoChangeRef.current) {
              onPackageInfoChangeRef.current(null);
            }
            
            return;
          } else {
            console.warn('[ProductConfigurator] No price in PRICEBYKEY response, falling back to POST:', data);
            
            // FALLBACK: Try POST /price with productOptions when PRICEBYKEY returns empty
            try {
              const productOptions = Object.values(selectedOptions);
              console.log('[ProductConfigurator] Fallback POST request with productOptions:', productOptions);
              
              const { data: postData, error: postError } = await invokeWithRetry(
                supabase,
                'sinalite-price',
                {
                  body: {
                    productId: vendorProductId,
                    storeCode: storeCode,
                    productOptions: productOptions,
                    method: 'POST'
                  },
                },
                {
                  maxAttempts: 2,
                  initialDelayMs: 500,
                  shouldRetry: (err: any) => err?.status === 503 || err?.status >= 500
                }
              );
              
              console.log('[ProductConfigurator] Fallback POST response:', postData, 'error:', postError);
              
              if (!postError && postData) {
                let priceValue = null;
                if (typeof postData === 'object') {
                  if (postData.price !== undefined) {
                    priceValue = parseFloat(postData.price);
                  } else if (Array.isArray(postData) && postData[0]?.price !== undefined) {
                    priceValue = parseFloat(postData[0].price);
                  } else if (postData.total !== undefined) {
                    priceValue = parseFloat(postData.total);
                  }
                }
                
                if (priceValue && priceValue > 0) {
                  const priceCents = Math.round(priceValue * 100);
                  console.log('[ProductConfigurator] Fallback POST price received:', priceCents);
                  setPriceError(null);
                  setFetchingPrice(false);
                  setPriceCache(variantKey, priceCents);
                  onPriceChangeRef.current(priceCents);
                  return;
                }
              }
            } catch (fallbackErr) {
              console.error('[ProductConfigurator] Fallback POST failed:', fallbackErr);
            }
            
            // If fallback also fails, clear the ref - the user will see the error message
            lastChangedOptionRef.current = null;
            
            // CRITICAL: Set price to 0 to indicate invalid configuration
            onPriceChangeRef.current(0);
            setPriceError('This configuration is not available. Please try a different option.');
            setFetchingPrice(false);
          }
        } catch (err: any) {
          console.error('[ProductConfigurator] Price fetch exception:', err);
          
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
    }, debounceDelay);
    
    return () => clearTimeout(timeoutId);
    // Note: customQuantity is intentionally NOT in dependencies - we only refetch when button is clicked (manualPriceFetch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, optionGroups.length, vendorProductId, storeCode, productId, userInteracted, isVariableQty, manualPriceFetch]);

  const handleOptionChange = (group: string, optionId: string) => {
    console.log('[ProductConfigurator] handleOptionChange called:', { group, optionId });
    
    // Mark that user has interacted - enables price fetching
    setUserInteracted(true);
    
    const id = parseInt(optionId, 10);
    if (isNaN(id)) {
      console.error('[ProductConfigurator] Invalid option ID:', optionId);
      return;
    }
    
    // Track which option was just changed (for failure tracking)
    lastChangedOptionRef.current = { group, optionId: id };
    
    // Clear any price error when user makes a new selection
    setPriceError(null);
    
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
      onConfigChangeRef.current(configUpdate);
      
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
        {(fetchingPrice || validatingOptions) && (
          <div className="flex items-center gap-1 text-xs text-white/60">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{validatingOptions ? 'Loading options...' : 'Updating price...'}</span>
          </div>
        )}
        {!fetchingPrice && !validatingOptions && priceError && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="w-3 h-3" />
            <span>{priceError}</span>
          </div>
        )}
      </div>
      
      {optionGroups.map((group) => {
        const currentValue = selectedOptions[group.group];
        const stringValue = currentValue ? String(currentValue) : "";
        
        // Check if this is the quantity group
        const isQtyGroup = group.group.toLowerCase().includes('qty') || group.group.toLowerCase().includes('quantity');
        
        // SMART FILTERING: For dependent groups, only show options that are valid for current core configuration
        // For core groups (size, stock, qty), show all options
        const isDependent = isDependentGroup(group.group);
        let validOptions = group.options;
        
        if (isDependent && validationComplete && validOptionsMap[group.group]) {
          // Filter to only show valid options for this group
          const validSet = validOptionsMap[group.group];
          validOptions = group.options.filter(opt => validSet.has(opt.id));
          console.log(`[ProductConfigurator] ${group.group}: showing ${validOptions.length}/${group.options.length} valid options`);
        }
        
        // Skip rendering if group has no valid options
        if (validOptions.length === 0) {
          // During validation, show all options with loading state
          if (validatingOptions) {
            validOptions = group.options;
          } else {
            console.warn(`[ProductConfigurator] ${group.group} has no valid options for current configuration`);
            return null;
          }
        }
        
        // For variable quantity products, show an input field for qty instead of select
        if (isVariableQty && isQtyGroup) {
          // Parse min/max from options (should be 1 and 1000000 for variable qty products)
          const minOption = validOptions.find(opt => opt.name === "1");
          const maxOption = validOptions.find(opt => parseInt(opt.name) > 1);
          const minQty = minOption ? parseInt(minOption.name) : 1;
          const maxQty = maxOption ? parseInt(maxOption.name) : 1000000;
          
          return (
            <div key={group.group} className="space-y-2">
              <label htmlFor={group.group} className="block text-foreground font-semibold text-sm mb-1">
                {formatGroupName(group.group)} (Enter {minQty.toLocaleString()} - {maxQty.toLocaleString()})
              </label>
              <Input
                id={group.group}
                type="number"
                min={minQty}
                max={maxQty}
                value={customQuantity}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomQuantity(value);
                  setUserInteracted(true);
                }}
                onBlur={() => {
                  // Trigger price fetch when user clicks elsewhere
                  console.log('[ProductConfigurator] Input blur, triggering price fetch for qty:', customQuantity);
                  if (customQuantity && parseInt(customQuantity) >= minQty) {
                    setManualPriceFetch(prev => prev + 1);
                  }
                }}
                onKeyDown={(e) => {
                  // Trigger price fetch when user presses Enter
                  if (e.key === 'Enter') {
                    console.log('[ProductConfigurator] Enter pressed, triggering price fetch');
                    setManualPriceFetch(prev => prev + 1);
                  }
                }}
                className="w-full bg-white text-black border-white/20 focus:ring-2 focus:ring-white/40"
                placeholder={`Enter quantity (${minQty.toLocaleString()} - ${maxQty.toLocaleString()})`}
              />
              <button
                type="button"
                onClick={() => {
                  console.log('[ProductConfigurator] Check Price clicked, quantity:', customQuantity);
                  setManualPriceFetch(prev => prev + 1);
                }}
                disabled={fetchingPrice}
                className="w-full mt-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetchingPrice ? 'Checking...' : 'Check Price'}
              </button>
            </div>
          );
        }
        
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
                {validOptions.map((option) => (
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
