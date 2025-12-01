import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import StockNotificationForm from "@/components/StockNotificationForm";
import { getColorHex } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface ScalablePressConfiguratorProps {
  productId: string;
  productName: string;
  pricingData: any;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
  onSelectionComplete?: (isComplete: boolean) => void;
  onVariantKeyChange?: (variantKey: string) => void;
  onColorChange?: (color: { name: string; images?: any[] }) => void;
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
  onVariantKeyChange,
  onColorChange,
}: ScalablePressConfiguratorProps) {
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Extract available colors and sizes from pricing data
  const rawColors = pricingData?.colors || [];
  const items = pricingData?.items || {};
  const availability = pricingData?.availability || {};
  
  // If colors array is empty but items has data, derive colors from items keys
  const colors = rawColors.length > 0 
    ? rawColors 
    : Object.keys(items).map(colorKey => ({ 
        name: colorKey.split('/').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('/'),
        hex: null,
        images: []
      }));

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
      const firstColor = colors[0];
      setSelectedColor(firstColor.name);
      
      const colorKey = findColorKey(firstColor.name);
      const firstColorSizes = colorKey && items[colorKey] ? Object.keys(items[colorKey]) : [];
      if (firstColorSizes.length > 0) {
        setSelectedSize(firstColorSizes[0]);
      }
      
      // Notify parent about initial color selection with images
      if (onColorChange) {
        onColorChange({ name: firstColor.name, images: firstColor.images || [] });
      }
    }
  }, [colors, items, selectedColor, onColorChange]);

  // Update price and notify completion when selection changes
  useEffect(() => {
    const isComplete = !!(selectedColor && selectedSize);
    const colorKey = findColorKey(selectedColor);
    
    if (isComplete && colorKey && items[colorKey]?.[selectedSize]) {
      const priceData = items[colorKey][selectedSize];
      const defaultPriceCents = priceData.price || 0;
      
      // Generate variant key: "color-size" (e.g., "red-small")
      const variantKey = `${selectedColor.toLowerCase().replace(/\s+/g, '-')}-${selectedSize.toLowerCase()}`;
      
      console.log('[ScalablePressConfigurator] Price update:', { selectedColor, selectedSize, colorKey, defaultPriceCents, variantKey });
      
      // Check for custom price in database first
      const checkCustomPrice = async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: customPrice, error } = await supabase
            .from('product_configuration_prices')
            .select('custom_price_cents')
            .eq('product_id', productId)
            .eq('variant_key', variantKey)
            .maybeSingle();
          
          if (error) {
            console.error('[ScalablePressConfigurator] Error checking custom price:', error);
          } else if (customPrice && customPrice.custom_price_cents > 0) {
            console.log('[ScalablePressConfigurator] Using custom price:', customPrice.custom_price_cents);
            onPriceChange(customPrice.custom_price_cents);
            onConfigChange({
              color: selectedColor,
              size: selectedSize,
            });
            
            if (onVariantKeyChange) {
              onVariantKeyChange(variantKey);
            }
            return;
          }
        } catch (err) {
          console.error('[ScalablePressConfigurator] Exception checking custom price:', err);
        }
        
        // Use default API price if no custom price found
        onPriceChange(defaultPriceCents);
        onConfigChange({
          color: selectedColor,
          size: selectedSize,
        });
        
        if (onVariantKeyChange) {
          onVariantKeyChange(variantKey);
        }
      };
      
      checkCustomPrice();
    } else {
      // Clear variant key when selection is incomplete
      if (onVariantKeyChange) {
        onVariantKeyChange("");
      }
    }
    
    // Notify parent about selection completion status
    onSelectionComplete?.(isComplete);
  }, [selectedColor, selectedSize, items, productId, onPriceChange, onConfigChange, onSelectionComplete, onVariantKeyChange]);

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
    
    // Notify parent about color change with images
    if (onColorChange) {
      const colorObj = colors.find((c: any) => c.name === colorName);
      if (colorObj) {
        onColorChange({ name: colorName, images: colorObj.images });
      }
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
      {/* Color Selection with Product Images */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-3">
          Color: {selectedColor && <span className="text-primary font-medium">{selectedColor}</span>}
        </label>
        <div className="flex flex-wrap gap-3">
          {colors.map((color: any) => {
            const availabilityColorKey = Object.keys(availability).find(key => key.toLowerCase() === color.name.toLowerCase());
            const colorAvailability = availabilityColorKey ? availability[availabilityColorKey] : null;
            const hasStock = colorAvailability && Object.values(colorAvailability).some((qty: any) => qty > 0);
            
            // Get the first image for this color
            const colorImage = color.images && color.images.length > 0 
              ? (typeof color.images[0] === 'string' ? color.images[0] : color.images[0]?.url)
              : null;
            
            return (
              <div key={color.name} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleColorChange(color.name)}
                  className={`
                    relative w-20 h-20 rounded-lg border-2 transition-all duration-200 overflow-hidden cursor-pointer bg-muted
                    ${selectedColor === color.name 
                      ? 'border-primary ring-2 ring-primary/30 scale-105 shadow-lg' 
                      : 'border-border hover:border-primary/50 hover:scale-105 hover:shadow-md'
                    }
                    ${!hasStock ? 'opacity-50' : ''}
                  `}
                  title={`${color.name}${!hasStock ? ' (Out of Stock)' : ''}`}
                  aria-label={`Select ${color.name}`}
                >
                  {colorImage ? (
                    <img 
                      src={colorImage} 
                      alt={color.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex flex-col items-center justify-center"
                      style={{ backgroundColor: getColorHex(color.name, color.hex) }}
                    >
                      <ImageOff className="w-5 h-5 text-white/70 drop-shadow-md" />
                      <span className="text-[8px] text-white/80 font-medium mt-0.5 drop-shadow-md">No image</span>
                    </div>
                  )}
                  
                  {selectedColor === color.name && (
                    <span className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </span>
                  )}
                  
                  {!hasStock && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm" />
                  )}
                </button>
                <span className="text-xs text-foreground font-medium text-center max-w-20 truncate">{color.name}</span>
                <span className={`text-[10px] font-semibold ${hasStock ? 'text-green-500' : 'text-red-400'}`}>
                  {hasStock ? 'In Stock' : 'Out of Stock'}
                </span>
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
                <div key={size} className="flex flex-col items-center gap-1">
                  <button
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
                  <span className={`text-[10px] font-semibold ${isOutOfStock ? 'text-red-400' : 'text-green-400'}`}>
                    {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground">Select a color first</p>
          )}
        </div>
        
        {/* Stock indicator for selected size */}
        {selectedSize && currentStock !== undefined && (
          <div className={`mt-3 text-sm ${getStockStatus(currentStock).color} flex items-center gap-1.5 font-semibold`}>
            <span>●</span>
            {getStockStatus(currentStock).label}
          </div>
        )}
        
        {/* Stock Notification Form */}
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
    </div>
  );
}
