import { useState } from "react";
import GlassCard from "./GlassCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, Minus } from "lucide-react";
import ProductConfiguratorLoader from "./ProductConfiguratorLoader";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    image_url?: string | null;
    generated_image_url?: string | null;
    pricing_data?: any;
  };
  displayPriceCents: number;
  quantity: number;
  isInCart: boolean;
  requiresConfiguration: boolean;
  isConfigured: boolean;
  canAddToCart: boolean;
  onQuantityChange: (productId: string, delta: number) => void;
  onAddToCart: (product: any) => void;
  onPriceChange: (productId: string, price: number) => void;
  onConfigChange: (productId: string, config: Record<string, string>) => void;
};

export default function ProductCard({
  product,
  displayPriceCents,
  quantity,
  isInCart,
  requiresConfiguration,
  isConfigured,
  canAddToCart,
  onQuantityChange,
  onAddToCart,
  onPriceChange,
  onConfigChange,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = product.image_url || null;

  return (
    <GlassCard padding="p-6">
      <div className="flex flex-col items-start text-left space-y-4 w-full">
        {/* Product Image */}
        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-white/5 border border-white/10">
          {imageSrc && !imageError ? (
            <img 
              src={imageSrc} 
              alt={product.name}
              className="w-full h-full object-cover"
              loading="eager"
              onError={() => {
                setImageError(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <div className="text-center p-4">
                <svg className="w-16 h-16 mx-auto text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-white/40 text-xs mt-2">No image available</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-center justify-center w-full space-y-2">
          <h3 className="text-lg font-bold text-white text-center">
            {product.name}
          </h3>
          {isInCart && (
            <Badge className="bg-green-600 text-white border-green-400 text-xs">
              In Cart
            </Badge>
          )}
        </div>
        
        <div className="flex flex-col gap-1 w-full items-center text-center">
          {displayPriceCents > 0 ? (
            <>
              <p className="text-sm text-white/70">Regular Price:</p>
              <p className="text-2xl font-bold text-white">
                ${(displayPriceCents / 100).toFixed(2)}
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-white/60">—</p>
          )}
        </div>

        {/* Product Configuration */}
        {requiresConfiguration && (
          <div className="w-full">
            <ProductConfiguratorLoader
              productId={product.id}
              onPriceChange={(price) => onPriceChange(product.id, price)}
              onConfigChange={(config) => onConfigChange(product.id, config)}
              initialConfig={product.pricing_data?.userConfig}
            />
          </div>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center justify-center gap-3 w-full">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onQuantityChange(product.id, -1)}
            disabled={quantity === 0}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="text-white font-medium w-12 text-center">
            {quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onQuantityChange(product.id, 1)}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={() => onAddToCart(product)}
          disabled={!canAddToCart || quantity === 0}
          className="w-full rounded-full"
          size="lg"
        >
          Add to Cart
        </Button>
      </div>
    </GlassCard>
  );
}
