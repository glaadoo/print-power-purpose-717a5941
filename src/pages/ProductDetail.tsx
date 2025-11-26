import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";
import VistaprintNav from "@/components/VistaprintNav";
import ProductImageGallery from "@/components/product-detail/ProductImageGallery";
import ProductInfo from "@/components/product-detail/ProductInfo";
import ProductTabs from "@/components/product-detail/ProductTabs";
import RelatedProductsCarousel from "@/components/product-detail/RelatedProductsCarousel";
import FrequentlyBoughtCarousel from "@/components/product-detail/FrequentlyBoughtCarousel";
import RecentlyViewed from "@/components/RecentlyViewed";
import { toast } from "sonner";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import Footer from "@/components/Footer";

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
  subcategory?: string | null;
};

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add } = useCart();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [configuredPriceCents, setConfiguredPriceCents] = useState<number | null>(null);
  const [productConfig, setProductConfig] = useState<Record<string, string>>({});
  const [reviewsKey, setReviewsKey] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<ProductRow[]>([]);
  const [frequentlyBought, setFrequentlyBought] = useState<ProductRow[]>([]);
  const [artworkFileUrl, setArtworkFileUrl] = useState<string>("");
  const [artworkFileName, setArtworkFileName] = useState<string>("");
  const [avgRating, setAvgRating] = useState<number | undefined>(undefined);
  const [reviewCount, setReviewCount] = useState<number>(0);

  // Fetch product and related data
  useEffect(() => {
    if (!id) return;
    
    (async () => {
      setLoading(true);
      setErr(null);
      
      try {
        // Fetch main product
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        
        if (error) {
          setErr(error.message);
          return;
        }
        
        if (!data) {
          setErr("Product not found");
          return;
        }

        setProduct(data as ProductRow);
        
        // Track as recently viewed
        addRecentlyViewed({
          id: data.id,
          name: data.name,
          image_url: data.image_url,
          category: data.category
        });

        // Fetch reviews for rating
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("rating")
          .eq("product_id", id);
        
        if (reviewsData && reviewsData.length > 0) {
          const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
          setAvgRating(sum / reviewsData.length);
          setReviewCount(reviewsData.length);
        }

        // Fetch related products (same category, exclude Canada)
        const { data: related } = await supabase
          .from("products")
          .select("*")
          .eq("category", data.category)
          .neq("id", id)
          .eq("is_active", true)
          .limit(8);
        
        if (related) {
          const filteredRelated = (related as ProductRow[]).filter(
            product => !product.name.toLowerCase().includes('canada')
          );
          setRelatedProducts(filteredRelated);
        }

        // Fetch frequently bought together (same vendor, different category, exclude Canada)
        const { data: frequent } = await supabase
          .from("products")
          .select("*")
          .eq("vendor", data.vendor)
          .neq("category", data.category)
          .neq("id", id)
          .eq("is_active", true)
          .limit(8);
        
        if (frequent) {
          const filteredFrequent = (frequent as ProductRow[]).filter(
            product => !product.name.toLowerCase().includes('canada')
          );
          setFrequentlyBought(filteredFrequent);
        }
      } catch (error: any) {
        console.error("Error loading product:", error);
        setErr(error.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    document.title = product ? `${product.name} - Print Power Purpose` : "Product - Print Power Purpose";
  }, [product]);

  // Calculate unit price
  const requiresConfiguration = product?.pricing_data && 
    Array.isArray(product.pricing_data) && 
    product.pricing_data.length > 0;
  
  const isConfigured = configuredPriceCents !== null;
  const hasArtwork = Boolean(artworkFileUrl && artworkFileName);
  const canAddToCart: boolean = (!requiresConfiguration || isConfigured) && hasArtwork;

  let unitCents: number;
  if (configuredPriceCents !== null) {
    unitCents = configuredPriceCents;
  } else if (product && product.vendor === "sinalite" && product.pricing_data) {
    unitCents = 0;
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
      },
      Math.max(1, Number(qty))
    );
    
    toast.success(`Added ${qty} ${product.name} to cart`, {
      description: "Product has been added to your cart",
      action: {
        label: "View Cart",
        onClick: () => nav("/cart")
      }
    });
  }

  function handleCheckout() {
    if (!product || !canAddToCart) return;
    
    // Add to cart first
    add(
      {
        id: product.id,
        name: product.name,
        priceCents: unitCents,
        imageUrl: product.image_url,
        currency: product.currency || "USD",
      },
      Math.max(1, Number(qty))
    );
    
    // Navigate to checkout
    nav("/checkout");
  }

  const handleReviewSubmit = () => {
    setReviewsKey(prev => prev + 1);
  };

  // Get product images (support for multiple images in the future)
  const productImages = product?.image_url ? [product.image_url] : [];

  return (
    <div className="min-h-screen bg-white">
      <VistaprintNav />
      
      {/* Main Content */}
      <div className="pt-20">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center text-gray-600">Loading product…</div>
          </div>
        ) : err ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <p className="text-red-600 mb-4">{err || "Product not found"}</p>
              <button
                onClick={() => nav("/products")}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                ← Back to products
              </button>
            </div>
          </div>
        ) : product ? (
          <>
            {/* Top Section: Two-Column Layout */}
            <section className="bg-white py-8 md:py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                  {/* Left Column: Image Gallery */}
                  <div className="md:sticky md:top-24 md:self-start">
                    <ProductImageGallery
                      images={productImages}
                      productName={product.name}
                    />
                  </div>

                  {/* Right Column: Product Info */}
                  <div>
                    <ProductInfo
                      product={product}
                      unitPrice={unitPrice}
                      quantity={qty}
                      onQuantityChange={setQty}
                      onPriceChange={setConfiguredPriceCents}
                      onConfigChange={setProductConfig}
                      onAddToCart={handleAddToCart}
                      onCheckout={handleCheckout}
                      canAddToCart={canAddToCart}
                      avgRating={avgRating}
                      reviewCount={reviewCount}
                      artworkFileUrl={artworkFileUrl}
                      artworkFileName={artworkFileName}
                      onArtworkUpload={(fileUrl, fileName) => {
                        setArtworkFileUrl(fileUrl);
                        setArtworkFileName(fileName);
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Banner / Promotional Section */}
            <section className="bg-blue-600 py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center text-white">
                  <p className="text-lg font-semibold">
                    🎉 Every purchase supports a nonprofit of your choice! 🎉
                  </p>
                  <p className="text-sm mt-1 opacity-90">
                    Choose your cause at checkout and make an impact with every order
                  </p>
                </div>
              </div>
            </section>

            {/* Product Details Tabs Section */}
            <section className="bg-white py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ProductTabs
                  product={product}
                  reviewsKey={reviewsKey}
                  onReviewSubmit={handleReviewSubmit}
                />
              </div>
            </section>

            {/* Related Products Carousel */}
            {relatedProducts.length > 0 && (
              <RelatedProductsCarousel products={relatedProducts} />
            )}

            {/* Frequently Bought Together Carousel */}
            {frequentlyBought.length > 0 && (
              <FrequentlyBoughtCarousel products={frequentlyBought} />
            )}

            {/* Recently Viewed Section */}
            <section className="bg-gray-50 py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <RecentlyViewed />
              </div>
            </section>
          </>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
