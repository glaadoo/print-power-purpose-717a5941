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

  // Get available sizes for selected color
  const availableSizes = selectedColor && items[selectedColor] 
    ? Object.keys(items[selectedColor]) 
    : [];
  
  // Get stock status for currently selected color/size
  const currentStock = selectedColor && selectedSize && availability[selectedColor]?.[selectedSize]
    ? availability[selectedColor][selectedSize]
    : undefined;

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
          {colors.map((color: any) => {
            // Check if color has any sizes in stock
            const colorAvailability = availability[color.name];
            const hasStock = colorAvailability && Object.values(colorAvailability).some((qty: any) => qty > 0);
            const isLowStock = colorAvailability && Object.values(colorAvailability).every((qty: any) => typeof qty === 'number' && qty < 50 && qty > 0);
            
            return (
              <button
                key={color.name}
                onClick={() => handleColorChange(color.name)}
                className={`
                  group relative flex flex-col items-center gap-2 p-2 rounded-lg transition-all
                  ${selectedColor === color.name 
                    ? 'bg-white/20 border-2 border-white shadow-lg' 
                    : 'bg-white/5 border-2 border-white/20 hover:bg-white/10 hover:border-white/40'
                  }
                  ${!hasStock ? 'opacity-50' : ''}
                `}
                title={`${color.name}${!hasStock ? ' (Out of Stock)' : isLowStock ? ' (Low Stock)' : ''}`}
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
                  {!hasStock && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                  )}
                  {hasStock && isLowStock && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <span className="text-xs text-white/90 font-medium capitalize max-w-[80px] text-center leading-tight">
                  {color.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Selection */}
      {availableSizes.length > 0 && (
        <div>
          <label className="text-sm font-semibold text-white mb-3 block flex items-center gap-2">
            <span className="text-red-400">*</span> Select Size
          </label>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size: string) => {
              const stockQty = selectedColor && availability[selectedColor]?.[size];
              const stockInfo = getStockStatus(stockQty);
              const isOutOfStock = stockInfo.status === 'out';
              
              return (
                <button
                  key={size}
                  onClick={() => !isOutOfStock && setSelectedSize(size)}
                  disabled={isOutOfStock}
                  className={`
                    min-w-[70px] px-4 py-2.5 rounded-full font-semibold text-sm transition-all border-2 relative
                    ${isOutOfStock 
                      ? 'bg-white/5 text-white/30 border-white/10 cursor-not-allowed' 
                      : selectedSize === size 
                        ? 'bg-white text-black border-white shadow-lg scale-105' 
                        : 'bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50 hover:scale-105'
                    }
                  `}
                  title={stockInfo.label}
                >
                  {size.toUpperCase()}
                  {isOutOfStock && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Stock indicator for selected size */}
          {selectedSize && currentStock !== undefined && (
            <div className={`mt-2 text-xs ${getStockStatus(currentStock).color} flex items-center gap-1`}>
              <span className="font-semibold">●</span>
              {getStockStatus(currentStock).label}
            </div>
          )}
          
          {/* Stock Notification Form - Show when selected size is out of stock */}
          {selectedColor && selectedSize && getStockStatus(currentStock).status === 'out' && (
            <div className="mt-3">
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
