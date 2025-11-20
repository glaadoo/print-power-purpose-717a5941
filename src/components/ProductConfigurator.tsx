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
};

export function ProductConfigurator({
  productId,
  vendorProductId,
  storeCode,
  pricingData,
  onPriceChange,
  onConfigChange,
  onPackageInfoChange,
}: ProductConfiguratorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [fetchingPrice, setFetchingPrice] = useState(false);

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

    // Convert to array of groups
    return Object.entries(groupMap).map(([group, opts]) => ({
      group,
      options: opts,
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
  }, [optionGroups]);

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
      setFetchingPrice(true);
      try {
        console.log('[ProductConfigurator] Fetching price for options:', optionIds);
        
        const { data, error } = await invokeWithRetry(
          supabase,
          'sinalite-price',
          {
            body: {
              productId: vendorProductId,
              storeCode: storeCode,
              productOptions: optionIds,
              method: 'POST' // Explicitly POST for price calculation
            },
          },
          {
            maxAttempts: 2,
            initialDelayMs: 500,
          }
        );

        if (error) {
          console.error('[ProductConfigurator] Price fetch error:', error);
          return;
        }

        if (data && data.price) {
          const priceFloat = parseFloat(data.price);
          const priceCents = Math.round(priceFloat * 100);
          console.log('[ProductConfigurator] Price received:', { price: data.price, priceCents });
          onPriceChange(priceCents);
          
          // Pass package info to parent if available
          if (onPackageInfoChange && data.packageInfo) {
            onPackageInfoChange(data.packageInfo);
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
  }, [selectedOptions, optionGroups.length, vendorProductId, storeCode]);

  const handleOptionChange = (group: string, optionId: string) => {
    const id = parseInt(optionId, 10);
    setSelectedOptions((prev) => ({
      ...prev,
      [group]: id,
    }));

    // Update config for parent
    const optionName = optionGroups
      .find(g => g.group === group)
      ?.options.find(o => o.id === id)?.name || optionId;
    
    onConfigChange({
      ...Object.fromEntries(
        Object.entries(selectedOptions).map(([g, oId]) => {
          const name = optionGroups
            .find(og => og.group === g)
            ?.options.find(o => o.id === oId)?.name || String(oId);
          return [g, name];
        })
      ),
      [group]: optionName,
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
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Configure Options:</h3>
        {fetchingPrice && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
      </div>
      
      {optionGroups.map((group) => (
        <div key={group.group} className="space-y-2">
          <Label htmlFor={group.group} className="text-foreground font-medium">
            {formatGroupName(group.group)}
          </Label>
          <Select
            value={String(selectedOptions[group.group] || "")}
            onValueChange={(value) => handleOptionChange(group.group, value)}
          >
            <SelectTrigger
              id={group.group}
              className="w-full bg-white text-black border-white/20 focus:ring-2 focus:ring-white/40 z-50"
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
      ))}
    </div>
  );
}
