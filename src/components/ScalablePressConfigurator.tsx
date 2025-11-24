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
    <div className="space-y-3 p-2">
      {/* Color Selection */}
      <div>
        <label className="text-xs font-medium text-white/80 mb-2 block">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {colors.map((color: any) => {
            const colorAvailability = availability[color.name];
            const hasStock = colorAvailability && Object.values(colorAvailability).some((qty: any) => qty > 0);
            
            return (
              <button
                key={color.name}
                onClick={() => handleColorChange(color.name)}
                className={`
                  relative w-8 h-8 rounded-full border-2 transition-all
                  ${selectedColor === color.name 
                    ? 'border-white ring-2 ring-white/50 scale-110' 
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
            );
          })}
        </div>
      </div>

      {/* Size Selection */}
      <div>
        <label className="text-xs font-medium text-white/80 mb-2 block">
          Size
        </label>
        <div className="flex flex-wrap gap-1.5">
          {availableSizes.length > 0 ? (
            availableSizes.map((size: string) => {
              const stockQty = selectedColor && availability[selectedColor]?.[size];
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
