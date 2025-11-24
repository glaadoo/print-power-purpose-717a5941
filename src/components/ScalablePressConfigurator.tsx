import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import StockNotificationForm from "@/components/StockNotificationForm";
import { getColorHex } from "@/lib/utils";

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
        <label className="block text-sm font-semibold text-foreground mb-3">
          Color: {selectedColor && <span className="text-primary font-medium">{selectedColor}</span>}
        </label>
        <div className="flex flex-wrap gap-4">
          {colors.map((color: any) => {
            const availabilityColorKey = Object.keys(availability).find(key => key.toLowerCase() === color.name.toLowerCase());
            const colorAvailability = availabilityColorKey ? availability[availabilityColorKey] : null;
            const hasStock = colorAvailability && Object.values(colorAvailability).some((qty: any) => qty > 0);
            const colorHex = getColorHex(color.name, color.hex);
            
            return (
              <div key={color.name} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (hasStock) {
                      handleColorChange(color.name);
                    }
                  }}
                  className={`
                    relative w-12 h-12 rounded-full border-4 transition-all duration-200 shadow-md
                    ${selectedColor === color.name 
                      ? 'border-primary ring-4 ring-primary/30 scale-110 shadow-lg shadow-primary/50' 
                      : 'border-white/30 hover:border-primary/50 hover:scale-105 hover:shadow-xl'
                    }
                    ${!hasStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}
                  `}
                  style={{ backgroundColor: colorHex }}
                  title={`${color.name}${!hasStock ? ' (Out of Stock)' : ''}`}
                  aria-label={`Select ${color.name}`}
                  disabled={!hasStock}
                >
                  {selectedColor === color.name && (
                    <span className="absolute inset-0 flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  {!hasStock && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md" />
                  )}
                </button>
                <span className="text-xs text-foreground font-medium text-center max-w-[60px] truncate">{color.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Size Selection */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-3">
          Size: {selectedSize && <span className="text-primary font-medium">{selectedSize.toUpperCase()}</span>}
        </label>
        <div className="flex flex-wrap gap-2">
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
                    px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200
                    ${isOutOfStock 
                      ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed border-2 border-muted' 
                      : selectedSize === size 
                        ? 'bg-primary text-primary-foreground border-2 border-primary ring-4 ring-primary/30 shadow-lg scale-105' 
                        : 'bg-background border-2 border-border text-foreground hover:border-primary/50 hover:bg-accent hover:scale-105'
                    }
                  `}
                  title={stockInfo.label}
                >
                  {size.toUpperCase()}
                </button>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">Select a color first</p>
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
