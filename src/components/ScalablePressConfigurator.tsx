import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ScalablePressConfiguratorProps {
  pricingData: any;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
  onSelectionComplete?: (isComplete: boolean) => void;
}

export default function ScalablePressConfigurator({
  pricingData,
  onPriceChange,
  onConfigChange,
  onSelectionComplete,
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

  // Update price and notify completion when selection changes
  useEffect(() => {
    const isComplete = !!(selectedColor && selectedSize);
    
    if (isComplete && items[selectedColor]?.[selectedSize]) {
      const priceData = items[selectedColor][selectedSize];
      const priceCents = priceData.price || 0;
      
      console.log('[ScalablePressConfigurator] Price update:', { selectedColor, selectedSize, priceCents });
      onPriceChange(priceCents);
      onConfigChange({
        color: selectedColor,
        size: selectedSize,
      });
    }
    
    // Notify parent about selection completion status
    onSelectionComplete?.(isComplete);
  }, [selectedColor, selectedSize, items, onPriceChange, onConfigChange, onSelectionComplete]);

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
    <div className="space-y-5 p-4 bg-white/5 rounded-lg border border-white/10">
      {/* Color Selection */}
      <div>
        <label className="text-sm font-semibold text-white mb-3 block flex items-center gap-2">
          <span className="text-red-400">*</span> Select Color
        </label>
        <div className="flex flex-wrap gap-3">
          {colors.map((color: any) => (
            <button
              key={color.name}
              onClick={() => handleColorChange(color.name)}
              className={`
                group relative flex flex-col items-center gap-2 p-2 rounded-lg transition-all
                ${selectedColor === color.name 
                  ? 'bg-white/20 border-2 border-white shadow-lg' 
                  : 'bg-white/5 border-2 border-white/20 hover:bg-white/10 hover:border-white/40'
                }
              `}
              title={color.name}
              aria-label={`Select ${color.name}`}
            >
              <div 
                className={`
                  w-12 h-12 rounded-full border-2 transition-all
                  ${selectedColor === color.name 
                    ? 'border-white shadow-xl scale-110' 
                    : 'border-white/30 group-hover:border-white/60 group-hover:scale-105'
                  }
                `}
                style={{ backgroundColor: color.hex }}
              >
                {selectedColor === color.name && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold drop-shadow-lg">
                    ✓
                  </span>
                )}
              </div>
              <span className="text-xs text-white/90 font-medium capitalize max-w-[80px] text-center leading-tight">
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Size Selection */}
      {availableSizes.length > 0 && (
        <div>
          <label className="text-sm font-semibold text-white mb-3 block flex items-center gap-2">
            <span className="text-red-400">*</span> Select Size
          </label>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size: string) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`
                  min-w-[70px] px-4 py-2.5 rounded-full font-semibold text-sm transition-all border-2
                  ${selectedSize === size 
                    ? 'bg-white text-black border-white shadow-lg scale-105' 
                    : 'bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 hover:scale-105'
                  }
                `}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Validation Message */}
      {(!selectedColor || !selectedSize) && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <span className="text-yellow-400 text-lg">⚠️</span>
          <p className="text-xs text-yellow-200">
            Please select both a color and size to continue
          </p>
        </div>
      )}
    </div>
  );
}
