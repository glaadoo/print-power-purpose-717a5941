import { useComparison } from "@/context/ComparisonContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import VideoBackground from "@/components/VideoBackground";

export default function Compare() {
  const { products, remove, clear } = useComparison();
  const { add: addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (product: any) => {
    addToCart(
      {
        id: product.id,
        name: product.name,
        priceCents: product.base_cost_cents,
        imageUrl: product.image_url,
        currency: "USD",
      },
      1
    );
    toast.success(`Added ${product.name} to cart`);
  };

  const handleViewProduct = (product: any) => {
    const categorySlug = product.category?.toLowerCase().replace(/\s+/g, '-') || 'products';
    const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    navigate(`/product/${categorySlug}/${productSlug}`, { state: { productId: product.id } });
  };

  if (products.length === 0) {
    return (
      <div className="fixed inset-0">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">No Products to Compare</h1>
          <p className="text-lg text-white/80 mb-8">
            Add products from the products page to compare them side-by-side
          </p>
          <Button onClick={() => navigate("/products")} size="lg" className="rounded-full">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  const comparisonRows = [
    { label: "Image", key: "image" },
    { label: "Name", key: "name" },
    { label: "Price", key: "price" },
    { label: "Category", key: "category" },
    { label: "Vendor", key: "vendor" },
    { label: "Description", key: "description" },
  ];

  return (
    <div className="fixed inset-0">
      <VideoBackground
        srcMp4="/media/hero.mp4"
        srcWebm="/media/hero.webm"
        poster="/media/hero-poster.jpg"
        overlay={<div className="absolute inset-0 bg-black/60" />}
      />

      <div className="relative z-10 min-h-screen overflow-y-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">Product Comparison</h1>
                <p className="text-white/70">Compare {products.length} products side-by-side</p>
              </div>
            </div>
            <Button
              onClick={clear}
              variant="outline"
              className="bg-red-500/20 border-red-500/50 text-white hover:bg-red-500/30"
            >
              Clear All
            </Button>
          </div>

          {/* Comparison Table */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="sticky left-0 z-10 bg-white/10 backdrop-blur p-4 text-left font-semibold text-white border-b border-white/20 min-w-[150px]">
                      Feature
                    </th>
                    {products.map((product) => (
                      <th
                        key={product.id}
                        className="p-4 border-b border-white/20 min-w-[250px] relative"
                      >
                        <button
                          onClick={() => remove(product.id)}
                          className="absolute top-2 right-2 text-white/60 hover:text-red-400 transition-colors bg-white/10 rounded-full p-1"
                          aria-label={`Remove ${product.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) => (
                    <tr key={row.key} className={index % 2 === 0 ? "bg-white/5" : ""}>
                      <td className="sticky left-0 z-10 bg-white/10 backdrop-blur p-4 font-medium text-white border-b border-white/10">
                        {row.label}
                      </td>
                      {products.map((product) => (
                        <td key={product.id} className="p-4 border-b border-white/10 text-white">
                          {row.key === "image" && (
                            <div className="w-full h-40 rounded-lg overflow-hidden bg-white/10 border border-white/20">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/40">
                                  No image
                                </div>
                              )}
                            </div>
                          )}
                          {row.key === "name" && (
                            <div className="font-semibold text-lg">{product.name}</div>
                          )}
                          {row.key === "price" && (
                            <div className="text-2xl font-bold text-primary-foreground">
                              ${(product.base_cost_cents / 100).toFixed(2)}
                            </div>
                          )}
                          {row.key === "category" && (
                            <div className="text-sm text-white/70">
                              {product.category || "N/A"}
                            </div>
                          )}
                          {row.key === "vendor" && (
                            <div className="text-sm capitalize text-white/80">
                              {product.vendor || "N/A"}
                            </div>
                          )}
                          {row.key === "description" && (
                            <div className="text-sm text-white/70 line-clamp-3">
                              {product.description || "No description available"}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Actions Row */}
                  <tr className="bg-white/5">
                    <td className="sticky left-0 z-10 bg-white/10 backdrop-blur p-4 font-medium text-white">
                      Actions
                    </td>
                    {products.map((product) => (
                      <td key={product.id} className="p-4">
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => handleViewProduct(product)}
                            variant="outline"
                            className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            View Details
                          </Button>
                          <Button
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
