import { Star, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductConfiguratorLoader from "@/components/ProductConfiguratorLoader";
import ArtworkUpload from "@/components/ArtworkUpload";

type ProductInfoProps = {
  product: {
    id: string;
    name: string;
    description?: string | null;
    base_cost_cents: number;
    vendor?: string | null;
    pricing_data?: any;
  };
  unitPrice: number;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
  onAddToCart: () => void;
  onCheckout: () => void;
  canAddToCart: boolean;
  avgRating?: number;
  reviewCount?: number;
  artworkFileUrl: string;
  artworkFileName: string;
  onArtworkUpload: (fileUrl: string, fileName: string) => void;
};

export default function ProductInfo({
  product,
  unitPrice,
  quantity,
  onQuantityChange,
  onPriceChange,
  onConfigChange,
  onAddToCart,
  onCheckout,
  canAddToCart,
  avgRating,
  reviewCount,
  artworkFileUrl,
  artworkFileName,
  onArtworkUpload,
}: ProductInfoProps) {
  return (
    <div className="space-y-6">
      {/* Title and Rating */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {product.name}
        </h1>

        {/* Rating */}
        {avgRating && reviewCount ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-900">{avgRating.toFixed(1)}</span>
            </div>
            <a href="#reviews-section" className="text-blue-600 hover:text-blue-700 text-sm underline">
              ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
            </a>
          </div>
        ) : null}
      </div>

      {/* Price */}
      <div className="border-t border-b border-gray-200 py-4">
        {unitPrice > 0 ? (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              ${unitPrice.toFixed(2)}
            </span>
            <span className="text-gray-600">/ unit</span>
          </div>
        ) : (
          <p className="text-lg text-amber-600">
            Configure product to see pricing
          </p>
        )}
      </div>

      {/* Shipping Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
        <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-gray-900">Free shipping on orders over $100</p>
          <p className="text-gray-600 mt-1">Standard delivery: 7-10 business days</p>
        </div>
      </div>

      {/* Product Description */}
      {product.description && (
        <div>
          <p className="text-gray-700 leading-relaxed">{product.description}</p>
        </div>
      )}

      {/* Configuration Options */}
      {(product.pricing_data || product.vendor === 'sinalite') && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Options</h3>
          <ProductConfiguratorLoader
            productId={product.id}
            onPriceChange={onPriceChange}
            onConfigChange={onConfigChange}
            onQuantityOptionsChange={() => {}}
          />
        </div>
      )}

      {/* Quantity Selector */}
      <div className="border-t border-gray-200 pt-6">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Quantity
        </label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value || 1)))}
          className="w-32 rounded-lg bg-white border border-gray-300 text-gray-900 px-4 py-2 text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
        />
      </div>

      {/* Artwork Upload */}
      <div className="border-t border-gray-200 pt-6">
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Upload Your Artwork</h3>
              <p className="text-sm text-gray-700">Required before adding to cart</p>
            </div>
          </div>
          <ArtworkUpload
            productId={product.id}
            productName={product.name}
            onUploadComplete={onArtworkUpload}
            initialFileUrl={artworkFileUrl}
            initialFileName={artworkFileName}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 pt-6 space-y-3">
        <Button
          onClick={onAddToCart}
          disabled={!canAddToCart}
          className="w-full rounded-full px-6 py-6 bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add to Cart
        </Button>

        <Button
          onClick={onCheckout}
          disabled={!canAddToCart}
          variant="outline"
          className="w-full rounded-full px-6 py-6 border-2 border-gray-900 bg-white text-gray-900 text-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Buy Now
        </Button>

        {!canAddToCart && (
          <p className="text-sm text-amber-600 text-center">
            Please upload your artwork and configure all options before adding to cart
          </p>
        )}
      </div>
    </div>
  );
}
