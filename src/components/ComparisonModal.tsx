import { useComparison } from "@/context/ComparisonContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComparisonModal({ isOpen, onClose }: ComparisonModalProps) {
  const { products, remove, clear } = useComparison();
  const { add: addToCart } = useCart();
  const navigate = useNavigate();

  if (products.length === 0) {
    return null;
  }

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
    onClose();
    navigate(`/product/${categorySlug}/${productSlug}`, { state: { productId: product.id } });
  };

  const comparisonRows = [
    { label: "Image", key: "image" },
    { label: "Name", key: "name" },
    { label: "Price", key: "price" },
    { label: "Category", key: "category" },
    { label: "Vendor", key: "vendor" },
    { label: "Description", key: "description" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-lg border border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Product Comparison
            <span className="text-sm text-muted-foreground font-normal">
              ({products.length} products)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background/95 backdrop-blur p-4 text-left font-semibold border-b border-border min-w-[150px]">
                  Feature
                </th>
                {products.map((product) => (
                  <th
                    key={product.id}
                    className="p-4 border-b border-border min-w-[250px] relative"
                  >
                    <button
                      onClick={() => remove(product.id)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
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
                <tr key={row.key} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="sticky left-0 z-10 bg-background/95 backdrop-blur p-4 font-medium border-b border-border">
                    {row.label}
                  </td>
                  {products.map((product) => (
                    <td key={product.id} className="p-4 border-b border-border">
                      {row.key === "image" && (
                        <div className="w-full h-40 rounded-lg overflow-hidden bg-muted">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              No image
                            </div>
                          )}
                        </div>
                      )}
                      {row.key === "name" && (
                        <div className="font-semibold text-lg">{product.name}</div>
                      )}
                      {row.key === "price" && (
                        <div className="text-2xl font-bold text-primary">
                          ${(product.base_cost_cents / 100).toFixed(2)}
                        </div>
                      )}
                      {row.key === "category" && (
                        <div className="text-sm text-muted-foreground">
                          {product.category || "N/A"}
                        </div>
                      )}
                      {row.key === "vendor" && (
                        <div className="text-sm capitalize">
                          {product.vendor || "N/A"}
                        </div>
                      )}
                      {row.key === "description" && (
                        <div className="text-sm text-muted-foreground line-clamp-3">
                          {product.description || "No description available"}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Actions Row */}
              <tr>
                <td className="sticky left-0 z-10 bg-background/95 backdrop-blur p-4 font-medium">
                  Actions
                </td>
                {products.map((product) => (
                  <td key={product.id} className="p-4">
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleViewProduct(product)}
                        variant="outline"
                        className="w-full"
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={() => handleAddToCart(product)}
                        className="w-full"
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

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Button onClick={clear} variant="outline" className="text-destructive">
            Clear All
          </Button>
          <Button onClick={onClose} variant="default">
            Close Comparison
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
