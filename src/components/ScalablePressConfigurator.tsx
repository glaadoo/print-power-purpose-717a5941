import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import StockNotificationForm from "@/components/StockNotificationForm";

interface ScalablePressConfiguratorProps {
  productId: string;
  productName: string;
  pricingData: any;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
  onSelectionComplete?: (isComplete: boolean) => void;
}

const getStockStatus = (quantity: number | undefined): { status: string; color: string; label: string } => {
  if (quantity === undefined || quantity === null) return { status: 'unknown', color: 'text-white/50', label: 'Stock Unknown' };
  if (quantity === 0) return { status: 'out', color: 'text-red-400', label: 'Out of Stock' };
  if (quantity < 50) return { status: 'low', color: 'text-yellow-400', label: `Low Stock (${quantity})` };
  return { status: 'in', color: 'text-green-400', label: 'In Stock' };
};

export default function ScalablePressConfigurator({
  productId,
  productName,
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
  const availability = pricingData?.availability || {};

  // Helper to find matching color key (case-insensitive)
  const findColorKey = (colorName: string) => {
    if (!colorName) return null;
    const lowerColorName = colorName.toLowerCase();
    const matchingKey = Object.keys(items).find(key => key.toLowerCase() === lowerColorName);
    return matchingKey || null;
  };

  // Get available sizes for selected color
  const colorKey = findColorKey(selectedColor);
  const availableSizes = colorKey && items[colorKey] 
    ? Object.keys(items[colorKey]) 
    : [];
  
  // Get stock status for currently selected color/size
  const availabilityColorKey = selectedColor ? Object.keys(availability).find(key => key.toLowerCase() === selectedColor.toLowerCase()) : null;
  const currentStock = availabilityColorKey && selectedSize && availability[availabilityColorKey]?.[selectedSize]
    ? availability[availabilityColorKey][selectedSize]
    : undefined;

  // Initialize with first available color and size
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      const firstColor = colors[0].name;
      setSelectedColor(firstColor);
      
      const colorKey = findColorKey(firstColor);
      const firstColorSizes = colorKey && items[colorKey] ? Object.keys(items[colorKey]) : [];
      if (firstColorSizes.length > 0) {
        setSelectedSize(firstColorSizes[0]);
      }
    }
  }, [colors, items, selectedColor]);

  // Update price and notify completion when selection changes
  useEffect(() => {
    const isComplete = !!(selectedColor && selectedSize);
    const colorKey = findColorKey(selectedColor);
    
    if (isComplete && colorKey && items[colorKey]?.[selectedSize]) {
      const priceData = items[colorKey][selectedSize];
      const priceCents = priceData.price || 0;
      
      console.log('[ScalablePressConfigurator] Price update:', { selectedColor, selectedSize, colorKey, priceCents });
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
    const colorKey = findColorKey(colorName);
    const newColorSizes = colorKey && items[colorKey] ? Object.keys(items[colorKey]) : [];
    if (newColorSizes.length > 0) {
      setSelectedSize(newColorSizes[0]);
    } else {
      setSelectedSize("");
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
    <div className="space-y-4 p-3 bg-white/5 rounded-lg border border-white/10">
      {/* Color Selection */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Color: {selectedColor && <span className="text-primary-foreground">{selectedColor}</span>}
        </label>
        <div className="flex flex-wrap gap-3">
          {colors.map((color: any) => {
            const availabilityColorKey = Object.keys(availability).find(key => key.toLowerCase() === color.name.toLowerCase());
            const colorAvailability = availabilityColorKey ? availability[availabilityColorKey] : null;
            const hasStock = colorAvailability && Object.values(colorAvailability).some((qty: any) => qty > 0);
            
            return (
              <div key={color.name} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handleColorChange(color.name)}
                  className={`
                    relative w-10 h-10 rounded-full border-2 transition-all
                    ${selectedColor === color.name 
                      ? 'border-white ring-2 ring-primary-foreground scale-110' 
                      : 'border-white/30 hover:border-white/60 hover:scale-105'
                    }
                    ${!hasStock ? 'opacity-40' : ''}
                  `}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  aria-label={`Select ${color.name}`}
                >
                  {selectedColor === color.name && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                      ✓
                    </span>
                  )}
                  {!hasStock && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                  )}
                </button>
                <span className="text-xs text-white/80 text-center">{color.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Size Selection */}
      <div>
        <label className="block text-sm font-semibold text-white mb-3">
          Size: {selectedSize && <span className="text-primary-foreground">{selectedSize.toUpperCase()}</span>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {availableSizes.length > 0 ? (
            availableSizes.map((size: string) => {
              const availabilityColorKey = selectedColor ? Object.keys(availability).find(key => key.toLowerCase() === selectedColor.toLowerCase()) : null;
              const stockQty = availabilityColorKey && availability[availabilityColorKey]?.[size];
              const stockInfo = getStockStatus(stockQty);
              const isOutOfStock = stockInfo.status === 'out';
              
              return (
                <button
                  key={size}
                  onClick={() => !isOutOfStock && setSelectedSize(size)}
                  disabled={isOutOfStock}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${isOutOfStock 
                      ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                      : selectedSize === size 
                        ? 'bg-white text-black' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }
                  `}
                  title={stockInfo.label}
                >
                  {size.toUpperCase()}
                </button>
              );
            })
          ) : (
            <p className="text-xs text-white/50">Select a color first</p>
          )}
        </div>
        
        {/* Stock indicator for selected size */}
        {selectedSize && currentStock !== undefined && (
          <div className={`mt-1.5 text-xs ${getStockStatus(currentStock).color} flex items-center gap-1`}>
            <span>●</span>
            {getStockStatus(currentStock).label}
          </div>
        )}
        
        {/* Stock Notification Form */}
        {selectedColor && selectedSize && getStockStatus(currentStock).status === 'out' && (
          <div className="mt-2">
            <StockNotificationForm
              productId={productId}
              productName={productName}
              color={selectedColor}
              size={selectedSize}
              vendor="scalablepress"
            />
          </div>
        )}
      </div>
    </div>
  );
}
