import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type PricingCombo = {
  value: string;
  attributes: Record<string, string>;
};

type ProductConfiguratorProps = {
  pricingData: any;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
};

export function ProductConfigurator({
  pricingData,
  onPriceChange,
  onConfigChange,
}: ProductConfiguratorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Parse pricing combinations from SinaLite structure
  const pricingCombos: PricingCombo[] = useMemo(() => {
    if (!pricingData || !Array.isArray(pricingData)) return [];
    
    // SinaLite structure: [0] = options array, [1] = combinations array
    const combos = pricingData[1] || [];
    
    // Check if combos have the expected attributes field
    const hasAttributes = combos.length > 0 && combos[0]?.attributes;
    
    if (!hasAttributes) {
      console.warn('[ProductConfigurator] Pricing data lacks attribute mappings. Cannot build configurator.');
      return [];
    }
    
    return combos
      .filter((combo: any) => {
        const price = parseFloat(combo.value);
        return !isNaN(price) && price >= 1 && price <= 10000;
      })
      .map((combo: any) => ({
        value: combo.value,
        attributes: combo.attributes || {},
      }));
  }, [pricingData]);

  // Extract unique option categories and their values
  const optionCategories = useMemo(() => {
    const categories: Record<string, Set<string>> = {};

    pricingCombos.forEach((combo) => {
      Object.entries(combo.attributes).forEach(([key, value]) => {
        if (!categories[key]) {
          categories[key] = new Set();
        }
        if (value && String(value).trim()) {
          categories[key].add(String(value));
        }
      });
    });

    // Convert Sets to sorted arrays
    const result: Record<string, string[]> = {};
    Object.entries(categories).forEach(([key, values]) => {
      result[key] = Array.from(values).sort();
    });

    return result;
  }, [pricingCombos]);

  // Initialize with first available options
  useEffect(() => {
    const initial: Record<string, string> = {};
    Object.entries(optionCategories).forEach(([key, values]) => {
      if (values.length > 0) {
        initial[key] = values[0];
      }
    });
    setSelectedOptions(initial);
  }, [optionCategories]);

  // Calculate price based on selected options
  useEffect(() => {
    const matchingCombo = pricingCombos.find((combo) => {
      return Object.entries(selectedOptions).every(
        ([key, value]) => combo.attributes[key] === value
      );
    });

    if (matchingCombo) {
      const priceCents = Math.round(parseFloat(matchingCombo.value) * 100);
      onPriceChange(priceCents);
      onConfigChange(selectedOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions, pricingCombos]);

  const handleOptionChange = (category: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  // Format category name for display
  const formatCategoryName = (key: string) => {
    return key
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (Object.keys(optionCategories).length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 w-full">
      <h3 className="text-sm font-semibold text-foreground mb-2">Price this item:</h3>
      {Object.entries(optionCategories).map(([category, values]) => (
        <div key={category} className="space-y-2">
          <Label htmlFor={category} className="text-foreground font-medium">
            {formatCategoryName(category)}
          </Label>
          <Select
            value={selectedOptions[category] || ""}
            onValueChange={(value) => handleOptionChange(category, value)}
          >
            <SelectTrigger
              id={category}
              className="w-full bg-white/90 text-black border-white/20 focus:ring-2 focus:ring-white/40 z-50"
            >
              <SelectValue placeholder={`Select ${formatCategoryName(category)}`} />
            </SelectTrigger>
            <SelectContent className="bg-white text-black z-[100] max-h-[300px]">
              {values.map((value) => (
                <SelectItem
                  key={value}
                  value={value}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
