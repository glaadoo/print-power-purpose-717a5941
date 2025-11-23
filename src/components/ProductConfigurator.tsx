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
import { Loader2 } from "lucide-react";
// Removed invokeWithRetry import - using direct API calls for speed

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
}: ProductConfiguratorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceCache, setPriceCache] = useState<Record<string, number>>({});

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

  // Initialize with first option from each group
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

    // Extract and pass quantity options to parent
    if (onQuantityOptionsChange) {
      const qtyGroup = optionGroups.find(g => 
        g.group.toLowerCase().includes('qty') || 
        g.group.toLowerCase().includes('quantity')
      );
      if (qtyGroup) {
        const qtyOptions = qtyGroup.options.map(opt => opt.name);
        console.log('[ProductConfigurator] Quantity options:', qtyOptions);
        onQuantityOptionsChange(qtyOptions);
      }
    }
  }, [optionGroups, onQuantityOptionsChange]);

  // Fetch price whenever selections change
  useEffect(() => {
    const optionIds = Object.values(selectedOptions);
    
    console.log('[ProductConfigurator] Price fetch check:', {
      optionIdsLength: optionIds.length,
      optionGroupsLength: optionGroups.length,
      optionIds,
      selectedOptions
    });
    
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
      
      // Check cache first
      if (priceCache[variantKey]) {
        console.log('[ProductConfigurator] Using cached price for:', variantKey);
        onPriceChange(priceCache[variantKey]);
        setFetchingPrice(false);
        return;
      }
      
      setFetchingPrice(true);
      console.log('[ProductConfigurator] Fetching price by key:', variantKey);
      
      try {
        const { data, error } = await supabase.functions.invoke('sinalite-price', {
          body: {
            productId: vendorProductId,
            storeCode: storeCode,
            variantKey: variantKey,
            method: 'PRICEBYKEY'
          },
        });

        if (error) {
          console.error('[ProductConfigurator] Price fetch error:', error);
          setFetchingPrice(false);
          return;
        }

        if (data && Array.isArray(data) && data.length > 0 && data[0].price) {
          const priceFloat = parseFloat(data[0].price);
          const priceCents = Math.round(priceFloat * 100);
          console.log('[ProductConfigurator] Price received and updating:', { price: data[0].price, priceCents });
          
          setPriceCache(prev => ({ ...prev, [variantKey]: priceCents }));
          onPriceChange(priceCents);
          
          if (onPackageInfoChange) {
            onPackageInfoChange(null);
          }
        } else {
          console.warn('[ProductConfigurator] No price in response:', data);
        }
      } catch (err) {
        console.error('[ProductConfigurator] Price fetch exception:', err);
      } finally {
        setFetchingPrice(false);
      }
    };

    fetchPrice();
  }, [selectedOptions, optionGroups.length, vendorProductId, storeCode, onPriceChange, onPackageInfoChange]);

  const handleOptionChange = (group: string, optionId: string) => {
    console.log('[ProductConfigurator] handleOptionChange called:', { group, optionId });
    
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

  // Format group name for display
  const formatGroupName = (group: string) => {
    return group
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Configure Options:</h3>
        {fetchingPrice && (
          <div className="flex items-center gap-1 text-xs text-white/60">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Updating price...</span>
          </div>
        )}
      </div>
      
      {optionGroups.map((group) => {
        const currentValue = selectedOptions[group.group];
        const stringValue = currentValue ? String(currentValue) : "";
        
        return (
          <div key={group.group} className="space-y-2">
            <Label htmlFor={group.group} className="text-foreground font-medium">
              {formatGroupName(group.group)}
            </Label>
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
