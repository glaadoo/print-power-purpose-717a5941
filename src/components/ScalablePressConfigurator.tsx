import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import StockNotificationForm from "@/components/StockNotificationForm";
import { getColorHex } from "@/lib/utils";
import { ImageOff } from "lucide-react";

// Helper to get display name (primary color before "/")
const getDisplayColorName = (colorName: string): string => {
  if (!colorName) return '';
  const parts = colorName.split('/');
  // Capitalize first letter of each word
  return parts[0].split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

interface ScalablePressConfiguratorProps {
  productId: string;
  productName: string;
  pricingData: any;
  mainProductImage?: string; // Fallback image when color-specific images are missing
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
  onSelectionComplete?: (isComplete: boolean) => void;
  onVariantKeyChange?: (variantKey: string) => void;
  onColorChange?: (color: { name: string; images?: any[] }) => void;
  onStockStatusChange?: (isOutOfStock: boolean, stockQuantity?: number) => void;
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
  mainProductImage,
  onPriceChange,
  onConfigChange,
  onSelectionComplete,
  onVariantKeyChange,
  onColorChange,
  onStockStatusChange,
}: ScalablePressConfiguratorProps) {
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Extract available colors and sizes from pricing data
  const rawColors = pricingData?.colors || [];
  const items = pricingData?.items || {};
  const availability = pricingData?.availability || {};
  
  // If colors array is empty but items has data, derive colors from items keys
  // Try to associate main product image with matching color or default to "black"
  const colors = rawColors.length > 0 
    ? rawColors 
    : Object.keys(items).map(colorKey => {
        const colorName = colorKey.split('/').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('/');
        const baseColor = colorKey.toLowerCase().split('/')[0];
        
        // Check if main product image URL contains this color name (case-insensitive)
        // OR if this is "black" (common default color for product photos)
        const mainImageMatchesColor = mainProductImage && (
          mainProductImage.toLowerCase().includes(baseColor) ||
          baseColor === 'black'
        );
        
        return { 
          name: colorName,
          hex: null,
          images: mainImageMatchesColor ? [mainProductImage] : []
        };
      });

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

  // Helper to find first in-stock size for a color
  const findFirstInStockSize = (colorName: string): string => {
    const colorKey = findColorKey(colorName);
    const sizes = colorKey && items[colorKey] ? Object.keys(items[colorKey]) : [];
    const availabilityColorKey = Object.keys(availability).find(key => key.toLowerCase() === colorName.toLowerCase());
    
    // Find first size with stock > 0
    for (const size of sizes) {
      const stockQty = availabilityColorKey ? availability[availabilityColorKey]?.[size] : undefined;
      if (stockQty === undefined || stockQty > 0) {
        return size;
      }
    }
    // If all sizes are out of stock, return the first size anyway (user will see out of stock message)
    return sizes[0] || "";
  };

  // Initialize with the first color that has images, or first available color
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      // First, try to find a color with images (preferred for display)
      let colorToSelect = colors.find((c: any) => c.images && c.images.length > 0) || colors[0];
      
      // If we have availability data, prefer colors that are in stock AND have images
      if (Object.keys(availability).length > 0) {
        const colorsWithStockAndImages = colors.filter((c: any) => {
          const availabilityColorKey = Object.keys(availability).find(key => key.toLowerCase() === c.name.toLowerCase());
          const colorAvailability = availabilityColorKey ? availability[availabilityColorKey] : null;
          const hasStock = colorAvailability && Object.values(colorAvailability).some((qty: any) => qty > 0);
          const hasImages = c.images && c.images.length > 0;
          return hasStock && hasImages;
        });
        
        if (colorsWithStockAndImages.length > 0) {
          colorToSelect = colorsWithStockAndImages[0];
        } else {
          // Fall back to any color with images
          const colorsWithImages = colors.filter((c: any) => c.images && c.images.length > 0);
          if (colorsWithImages.length > 0) {
            colorToSelect = colorsWithImages[0];
          }
        }
      }
      
      console.log('[ScalablePressConfigurator] Initial color selected:', colorToSelect.name, 'has images:', !!(colorToSelect.images && colorToSelect.images.length > 0));
      
      setSelectedColor(colorToSelect.name);
      
      // Select first in-stock size for this color
      const firstInStockSize = findFirstInStockSize(colorToSelect.name);
      if (firstInStockSize) {
        setSelectedSize(firstInStockSize);
      }
      
      // Notify parent about initial color selection with images (no fallback - show "no image" if none)
      if (onColorChange) {
        onColorChange({ name: colorToSelect.name, images: colorToSelect.images || [] });
      }
    }
  }, [colors.length, availability, selectedColor]);

  // Check if entire color is out of stock (all sizes have 0 stock)
  // If no availability data exists, assume in stock (don't block users)
  const isColorOutOfStock = (colorName: string): boolean => {
    if (Object.keys(availability).length === 0) return false; // No availability data = assume in stock
    
    const availabilityColorKey = Object.keys(availability).find(key => key.toLowerCase() === colorName.toLowerCase());
    if (!availabilityColorKey || !availability[availabilityColorKey]) return false; // Color not in availability = assume in stock
    
    const colorStocks = availability[availabilityColorKey];
    const allSizesOutOfStock = Object.values(colorStocks).every((qty: any) => qty === 0);
    return allSizesOutOfStock;
  };

  // Update price and notify completion when selection changes
  useEffect(() => {
    const isComplete = !!(selectedColor && selectedSize);
    const colorKey = findColorKey(selectedColor);
    
    // Check stock status - only mark as out of stock if we have explicit data showing 0
    const availabilityColorKey = selectedColor ? Object.keys(availability).find(key => key.toLowerCase() === selectedColor.toLowerCase()) : null;
    const stockQty = availabilityColorKey && selectedSize ? availability[availabilityColorKey]?.[selectedSize] : undefined;
    
    // Only consider out of stock if we have explicit data showing 0
    // undefined means no data = assume in stock
    const variantOutOfStock = stockQty === 0;
    const colorFullyOutOfStock = selectedColor ? isColorOutOfStock(selectedColor) : false;
    
    // Either the specific variant is out of stock, OR the entire color is out of stock
    const isOutOfStock = variantOutOfStock || colorFullyOutOfStock;
    
    // Notify parent about stock status
    if (onStockStatusChange) {
      onStockStatusChange(isOutOfStock, stockQty);
    }
    
    if (isComplete && colorKey && items[colorKey]?.[selectedSize]) {
      const priceData = items[colorKey][selectedSize];
      const defaultPriceCents = priceData.price || 0;
      
      // Generate variant key: "color-size" (e.g., "red-small")
      const variantKey = `${selectedColor.toLowerCase().replace(/\s+/g, '-')}-${selectedSize.toLowerCase()}`;
      
      console.log('[ScalablePressConfigurator] Price update:', { selectedColor, selectedSize, colorKey, defaultPriceCents, variantKey, isOutOfStock, stockQty });
      
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
              color: getDisplayColorName(selectedColor),
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
          color: getDisplayColorName(selectedColor),
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
  }, [selectedColor, selectedSize, items, productId, availability, onPriceChange, onConfigChange, onSelectionComplete, onVariantKeyChange, onStockStatusChange]);

  const handleColorChange = (colorName: string) => {
    setSelectedColor(colorName);
    
    // Reset size to first IN-STOCK size for new color
    const firstInStockSize = findFirstInStockSize(colorName);
    setSelectedSize(firstInStockSize);
    
    // Notify parent about color change with images (no fallback - show "no image" if none)
    if (onColorChange) {
      const colorObj = colors.find((c: any) => c.name === colorName);
      if (colorObj) {
        onColorChange({ name: colorName, images: colorObj.images || [] });
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
          Color: {selectedColor && <span className="text-primary font-medium">{getDisplayColorName(selectedColor)}</span>}
        </label>
        <div className="flex flex-wrap gap-3">
          {colors.map((color: any) => {
            const availabilityColorKey = Object.keys(availability).find(key => key.toLowerCase() === color.name.toLowerCase());
            const colorAvailability = availabilityColorKey ? availability[availabilityColorKey] : null;
            const hasStock = colorAvailability && Object.values(colorAvailability).some((qty: any) => qty > 0);
            
            // Get the first image for this color
            // Only use color-specific images - no fallback to main product image (would be misleading)
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
                  title={`${getDisplayColorName(color.name)}${!hasStock ? ' (Out of Stock)' : ''}`}
                  aria-label={`Select ${getDisplayColorName(color.name)}`}
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
                <span className="text-xs text-foreground font-medium text-center max-w-20 truncate">{getDisplayColorName(color.name)}</span>
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
