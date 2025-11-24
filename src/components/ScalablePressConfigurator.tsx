import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ScalablePressConfiguratorProps {
  pricingData: any;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
}

export default function ScalablePressConfigurator({
  pricingData,
  onPriceChange,
  onConfigChange,
}: ScalablePressConfiguratorProps) {
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Extract available colors and sizes from pricing data
  const colors = pricingData?.colors || [];
  const items = pricingData?.items || {};

  // Get available sizes for selected color
  const availableSizes = selectedColor && items[selectedColor] 
    ? Object.keys(items[selectedColor]) 
    : [];

  // Initialize with first available color and size
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      const firstColor = colors[0].name;
      setSelectedColor(firstColor);
      
      const firstColorSizes = items[firstColor] ? Object.keys(items[firstColor]) : [];
      if (firstColorSizes.length > 0) {
        setSelectedSize(firstColorSizes[0]);
      }
    }
  }, [colors, items, selectedColor]);

  // Update price when selection changes
  useEffect(() => {
    if (selectedColor && selectedSize && items[selectedColor]?.[selectedSize]) {
      const priceData = items[selectedColor][selectedSize];
      const priceCents = priceData.price || 0;
      
      console.log('[ScalablePressConfigurator] Price update:', { selectedColor, selectedSize, priceCents });
      onPriceChange(priceCents);
      onConfigChange({
        color: selectedColor,
        size: selectedSize,
      });
    }
  }, [selectedColor, selectedSize, items, onPriceChange, onConfigChange]);

  const handleColorChange = (colorName: string) => {
    setSelectedColor(colorName);
    
    // Reset size to first available for new color
    const newColorSizes = items[colorName] ? Object.keys(items[colorName]) : [];
    if (newColorSizes.length > 0) {
      setSelectedSize(newColorSizes[0]);
    }
  };

  if (!colors.length) {
    return (
      <div className="text-sm text-white/70">
        No configuration options available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Color Selection */}
      <div>
        <label className="text-sm font-medium text-white/90 mb-2 block">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {colors.map((color: any) => (
            <button
              key={color.name}
              onClick={() => handleColorChange(color.name)}
              className={`
                relative w-10 h-10 rounded-full border-2 transition-all
                ${selectedColor === color.name 
                  ? 'border-white shadow-lg scale-110' 
                  : 'border-white/30 hover:border-white/60 hover:scale-105'
                }
              `}
              style={{ backgroundColor: color.hex }}
              title={color.name}
              aria-label={`Select ${color.name}`}
            >
              {selectedColor === color.name && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xl">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
        {selectedColor && (
          <p className="text-xs text-white/70 mt-1 capitalize">{selectedColor}</p>
        )}
      </div>

      {/* Size Selection */}
      {availableSizes.length > 0 && (
        <div>
          <label className="text-sm font-medium text-white/90 mb-2 block">
            Size
          </label>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size: string) => (
              <Button
                key={size}
                onClick={() => setSelectedSize(size)}
                variant={selectedSize === size ? "default" : "outline"}
                size="sm"
                className={`
                  min-w-[60px] transition-all
                  ${selectedSize === size 
                    ? 'bg-white text-primary' 
                    : 'bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/60'
                  }
                `}
              >
                {size.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
