import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useComparison } from "@/context/ComparisonContext";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Star, ShoppingCart, Scale } from "lucide-react";
import ProductConfiguratorLoader from "@/components/ProductConfiguratorLoader";
import ScalablePressConfigurator from "@/components/ScalablePressConfigurator";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import ProductReviews from "@/components/ProductReviews";
import ReviewForm from "@/components/ReviewForm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ImageGallery from "@/components/ImageGallery";
import ArtworkUpload from "@/components/ArtworkUpload";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  currency?: string | null;
  base_cost_cents: number;
  pricing_data?: any;
  vendor_product_id?: string | null;
  vendor?: string | null;
  markup_fixed_cents?: number | null;
  markup_percent?: number | null;
  category?: string | null;
};

export default function ProductDetailNew() {
  const { category, subcategory, productName } = useParams();
  const location = useLocation();
  const productId = location.state?.productId;
  const nav = useNavigate();
  const { add, items } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { add: addToComparison, remove: removeFromComparison, isInComparison, canAddMore } = useComparison();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [configuredPriceCents, setConfiguredPriceCents] = useState<number | null>(null);
  const [productConfig, setProductConfig] = useState<Record<string, string>>({});
  const [packageInfo, setPackageInfo] = useState<any>(null);
  const [imageError, setImageError] = useState(false);
  const [reviewsKey, setReviewsKey] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<ProductRow[]>([]);
  const [frequentlyBought, setFrequentlyBought] = useState<ProductRow[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [artworkFileUrl, setArtworkFileUrl] = useState<string>("");
  const [artworkFileName, setArtworkFileName] = useState<string>("");

  // Fetch product by ID from Supabase
  useEffect(() => {
    if (!productId) {
      setErr("Product not found");
      setLoading(false);
      return;
    }
    
    (async () => {
      setLoading(true);
      setErr(null);
      
      // Fetch product data first (critical path)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
        
      if (error) {
        setErr(error.message);
        setLoading(false);
      } else if (!data) {
        setErr("Product not found");
        setLoading(false);
      } else {
        setProduct(data as ProductRow);
        setLoading(false); // Allow page to render immediately
        
        // Track as recently viewed
        addRecentlyViewed({
          id: data.id,
          name: data.name,
          image_url: data.image_url,
          category: data.category
        });

        // Load supplementary data in background (non-blocking)
        Promise.all([
          supabase
            .from("reviews")
            .select("rating")
            .eq("product_id", productId),
          supabase
            .from("products")
            .select("*")
            .eq("category", data.category)
            .neq("id", productId)
            .eq("is_active", true)
            .limit(6),
          supabase
            .from("products")
            .select("*")
            .eq("vendor", data.vendor)
            .neq("category", data.category)
            .neq("id", productId)
            .eq("is_active", true)
            .limit(6)
        ]).then(([reviewsResult, relatedResult, frequentResult]) => {
          if (reviewsResult.data && reviewsResult.data.length > 0) {
            const sum = reviewsResult.data.reduce((acc, r) => acc + r.rating, 0);
            setAvgRating(sum / reviewsResult.data.length);
            setReviewCount(reviewsResult.data.length);
          }

          if (relatedResult.data) {
            setRelatedProducts(relatedResult.data as ProductRow[]);
          }

          if (frequentResult.data) {
            setFrequentlyBought(frequentResult.data as ProductRow[]);
          }
        }).catch(err => {
          console.error('[ProductDetailNew] Background data fetch error:', err);
        });
      }
    })();
  }, [productId]);

  useEffect(() => {
    document.title = product ? `${product.name} - Print Power Purpose` : "Product - Print Power Purpose";
  }, [product]);

  // Check if product requires configuration
  const requiresConfiguration = product?.pricing_data && 
    Array.isArray(product.pricing_data) && 
    product.pricing_data.length > 0;
  
  const isConfigured = configuredPriceCents !== null;
  
  // Check if artwork is uploaded (required for all products)
  const hasArtwork = artworkFileUrl && artworkFileName;
  
  const canAddToCart = (!requiresConfiguration || isConfigured) && hasArtwork;

  // Calculate price
  let unitCents: number;
  if (configuredPriceCents !== null && configuredPriceCents > 0) {
    unitCents = configuredPriceCents;
  } else if (product && product.vendor === "sinalite" && product.pricing_data) {
    // SinaLite products require configuration - show 0 until configured
    unitCents = 0;
  } else if (product && product.vendor === "scalablepress") {
    // Scalable Press should use configuredPriceCents or base_cost_cents fallback
    unitCents = configuredPriceCents ?? product.base_cost_cents;
  } else if (product) {
    const markup_fixed = product.markup_fixed_cents ?? 0;
    const markup_percent = product.markup_percent ?? 0;
    const base = product.base_cost_cents;
    const markup_amount = Math.round(base * (markup_percent / 100)) + markup_fixed;
    unitCents = base + markup_amount;
  } else {
    unitCents = 0;
  }
  const unitPrice = unitCents / 100;

  function handleAddToCart() {
    if (!product || !canAddToCart) return;
    add(
      {
        id: product.id,
        name: product.name,
        priceCents: unitCents,
        imageUrl: product.image_url,
        currency: product.currency || "USD",
        configuration: productConfig,
        artworkUrl: artworkFileUrl,
        artworkFileName: artworkFileName,
      },
      Math.max(1, Number(qty))
    );
    
    // Show success toast
    toast.success("Product added to cart!", {
      description: "You can continue shopping or go to cart to checkout.",
    });
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <p className="text-white">Loading product...</p>
      </div>
    );
  }

  if (err || !product) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{err || "Product not found"}</p>
          <Button onClick={() => nav("/products")}>Back to Products</Button>
        </div>
      </div>
    );
  }

  // Build image gallery array
  const galleryImages: Array<{ url: string; label?: string }> = [];
  
  // Add main product image
  if (product.image_url && !imageError) {
    galleryImages.push({ url: product.image_url, label: "Main" });
  }
  
  // Add color variant images for Scalable Press products
  if (product.vendor === 'scalablepress' && product.pricing_data?.colors) {
    product.pricing_data.colors.forEach((color: any) => {
      if (color.images && Array.isArray(color.images)) {
        color.images.forEach((img: any, idx: number) => {
          if (img.url || img) {
            const imageUrl = typeof img === 'string' ? img : img.url;
            if (imageUrl && !galleryImages.some(g => g.url === imageUrl)) {
              galleryImages.push({ 
                url: imageUrl, 
                label: `${color.name} ${idx > 0 ? `- View ${idx + 1}` : ''}`
              });
            }
          }
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between backdrop-blur bg-background/80 border-b border-border">
        <Button
          onClick={() => nav("/products")}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        
        <div className="absolute left-1/2 -translate-x-1/2">
          <a
            href="/"
            className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          >
            PRINT POWER PURPOSE
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => nav("/favorites")}
            className="relative"
          >
            <Heart className="w-4 h-4" />
            {favoritesCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => nav("/cart")}
            className="relative"
          >
            <ShoppingCart className="w-4 h-4" />
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {items.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="text-sm text-muted-foreground mb-6">
            <button onClick={() => nav("/")} className="hover:text-foreground">Home</button>
            {" / "}
            <button onClick={() => nav("/products")} className="hover:text-foreground">Products</button>
            {product.category && (
              <>
                {" / "}
                <span>{product.category}</span>
              </>
            )}
            {" / "}
            <span className="text-foreground">{product.name}</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Product Image Gallery */}
            <div>
              {galleryImages.length > 0 ? (
                <ImageGallery
                  images={galleryImages}
                  alt={product.name}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center p-6">
                      <svg className="w-20 h-20 mx-auto text-muted-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-muted-foreground text-sm mt-3">No image available</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                
                {/* Rating */}
                {reviewCount > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-4 h-4",
                            star <= avgRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {avgRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}

                {/* Price */}
                {unitPrice > 0 ? (
                  <div className="mb-4">
                    <span className="text-3xl font-bold">${unitPrice.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground ml-2">per unit</span>
                  </div>
                ) : product?.vendor === 'sinalite' && product.pricing_data ? (
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/30 border-t-primary"></div>
                      <span className="text-sm text-muted-foreground">Loading price...</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                    Configure product to see pricing
                  </p>
                )}

                {/* Description */}
                {product.description && (
                  <p className="text-muted-foreground mb-6">{product.description}</p>
                )}
              </div>

              {/* Configuration for SinaLite Products */}
              {product.vendor === 'sinalite' && product.pricing_data && (
                <div className="border border-border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-semibold mb-4">Product Options</h3>
                  <ProductConfiguratorLoader
                    productId={product.id}
                    onPriceChange={setConfiguredPriceCents}
                    onConfigChange={setProductConfig}
                    onQuantityOptionsChange={() => {}}
                  />
                </div>
              )}
              
              {/* Configuration for Scalable Press Products */}
              {product.vendor === 'scalablepress' && product.pricing_data && product.pricing_data.colors && product.pricing_data.items && (
                <div className="border border-border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-semibold mb-4">Product Options</h3>
                  <ScalablePressConfigurator
                    productId={product.id}
                    productName={product.name}
                    pricingData={product.pricing_data}
                    onPriceChange={setConfiguredPriceCents}
                    onConfigChange={setProductConfig}
                  />
                </div>
              )}

              {/* Artwork Upload Section - REQUIRED */}
              <div className="w-full p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-2xl border-4 border-blue-400 dark:border-blue-600 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Upload Your Artwork</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Required before adding to cart</p>
                  </div>
                </div>
                <ArtworkUpload
                  productId={product.id}
                  productName={product.name}
                  onUploadComplete={(fileUrl, fileName) => {
                    setArtworkFileUrl(fileUrl);
                    setArtworkFileName(fileName);
                  }}
                  initialFileUrl={artworkFileUrl}
                  initialFileName={artworkFileName}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                  className="w-32 rounded-lg border border-border bg-background px-4 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {requiresConfiguration && !isConfigured && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Please select product options above before adding to cart
                </p>
              )}
              
              {!hasArtwork && (
                <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ Please upload your artwork before adding to cart
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={!canAddToCart}
                  size="lg"
                  className="flex-1"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>

                <Button
                  onClick={() => {
                    const isInCompare = isInComparison(product.id);
                    if (isInCompare) {
                      removeFromComparison(product.id);
                      toast.success("Removed from comparison");
                    } else {
                      if (!canAddMore) {
                        toast.error("Maximum 4 products can be compared");
                        return;
                      }
                      addToComparison({
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        base_cost_cents: unitPrice * 100 || product.base_cost_cents,
                        image_url: product.image_url,
                        category: product.category,
                        vendor: product.vendor,
                        pricing_data: product.pricing_data,
                      });
                      toast.success("Added to comparison");
                    }
                  }}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  <Scale className="mr-2 h-4 w-4" />
                  {isInComparison(product.id) ? "Remove from Compare" : "Add to Compare"}
                </Button>

                <Button
                  onClick={() => nav("/checkout", { state: { productId: product.id, qty } })}
                  disabled={!canAddToCart}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  Checkout Now
                </Button>
              </div>
            </div>
          </div>

          {/* Product Details Section */}
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-2xl font-bold mb-6">Product Details</h2>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                {product.description || 
                  "High-quality printing with fast turnaround times. Every order supports a cause of your choice."}
              </p>
              {packageInfo && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Package Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {packageInfo["total weight"] && (
                      <div><span className="font-medium">Weight:</span> {packageInfo["total weight"]} lbs</div>
                    )}
                    {packageInfo["box size"] && (
                      <div><span className="font-medium">Box Size:</span> {packageInfo["box size"]}"</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-12 border-t border-border pt-8">
              <h2 className="text-2xl font-bold mb-6">Related Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedProducts.map((p) => {
                  const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
                  const categorySlug = slugify(p.category || 'uncategorized');
                  const subcategorySlug = 'all'; // Related products don't have subcategory, default to 'all'
                  const productSlug = slugify(p.name);
                  return (
                    <div
                      key={p.id}
                      onClick={() => nav(`/products/${categorySlug}/${subcategorySlug}/${productSlug}`, { state: { productId: p.id } })}
                      className="cursor-pointer group"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border mb-2">
                        {p.image_url ? (
                          <img 
                            src={p.image_url} 
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-muted-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        From ${(p.base_cost_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
            <div className="space-y-6">
              <ReviewForm productId={product.id} onReviewSubmitted={() => setReviewsKey(prev => prev + 1)} />
              <ProductReviews key={reviewsKey} productId={product.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
