import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, RefreshCw, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, computeFinalPrice } from "@/lib/pricing-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  vendor: string;
  base_cost_cents: number;
  markup_fixed_cents: number;
  markup_percent: number;
  is_active: boolean;
  image_url?: string;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, any>>({});
  const [selectedStore, setSelectedStore] = useState<6 | 9>(9);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    markup_fixed_cents: 0,
    markup_percent: 0,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error loading products:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  const handleSync = async (vendor: string, functionName: string, storeCode?: number) => {
    const syncKey = storeCode ? `${vendor}-${storeCode}` : vendor;
    setSyncing(syncKey);
    setSyncResults((prev) => ({ ...prev, [syncKey]: null }));
    
    try {
      const body = storeCode ? { storeCode } : undefined;
      const { data, error } = await supabase.functions.invoke(functionName, {
        body
      });
      
      if (error) throw error;
      
      setSyncResults((prev) => ({ ...prev, [syncKey]: data }));
      
      if (data?.success) {
        const storeInfo = data.store ? ` (${data.store})` : '';
        toast.success(`${vendor}${storeInfo}: Synced ${data.synced} products successfully!`);
        loadProducts();
      } else {
        toast.warning(`${vendor}: ${data?.note || "Sync completed with issues"}`);
      }
    } catch (error: any) {
      console.error(`Error syncing ${vendor}:`, error);
      toast.error(`Failed to sync ${vendor}: ${error.message}`);
      setSyncResults((prev) => ({ ...prev, [syncKey]: { success: false, error: error.message } }));
    } finally {
      setSyncing(null);
    }
  };

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setEditForm({
      markup_fixed_cents: product.markup_fixed_cents || 0,
      markup_percent: product.markup_percent || 0,
    });
  }

  async function handleSaveMarkup() {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from("products")
        .update({
          markup_fixed_cents: editForm.markup_fixed_cents,
          markup_percent: editForm.markup_percent,
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      toast.success("Markup updated successfully");
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      console.error("Error updating markup:", err);
      toast.error("Failed to update markup");
    }
  }

  const vendors = [
    {
      name: "SinaLite",
      description: "Print products and promotional items",
      functionName: "sync-sinalite",
      color: "border-blue-500/50 bg-blue-500/10"
    },
    {
      name: "Scalable Press",
      description: "Custom apparel and merchandise",
      functionName: "sync-scalablepress",
      color: "border-purple-500/50 bg-purple-500/10"
    },
    {
      name: "PsRestful",
      description: "Additional print products",
      functionName: "sync-psrestful",
      color: "border-green-500/50 bg-green-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Product Management</h1>
            <p className="text-white/60 mt-1">Sync products and manage pricing markups</p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Sync Products from Vendors</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <Card key={vendor.name} className={`${vendor.color} border backdrop-blur-sm`}>
                <CardHeader>
                  <CardTitle className="text-white">{vendor.name}</CardTitle>
                  <CardDescription className="text-white/70">{vendor.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {vendor.name === "SinaLite" && (
                    <div className="mb-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setSelectedStore(9)}
                          variant={selectedStore === 9 ? "default" : "outline"}
                          size="sm"
                          className={selectedStore === 9 ? "" : "bg-white/10 text-white border-white/20"}
                        >
                          US Store
                        </Button>
                        <Button
                          onClick={() => setSelectedStore(6)}
                          variant={selectedStore === 6 ? "default" : "outline"}
                          size="sm"
                          className={selectedStore === 6 ? "" : "bg-white/10 text-white border-white/20"}
                        >
                          AU Store
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => handleSync(vendor.name, vendor.functionName, vendor.name === "SinaLite" ? selectedStore : undefined)}
                    disabled={syncing === `${vendor.name}-${vendor.name === "SinaLite" ? selectedStore : ""}`}
                    className="w-full bg-white/20 text-white hover:bg-white/30"
                  >
                    {syncing === `${vendor.name}-${vendor.name === "SinaLite" ? selectedStore : ""}` ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Sync Products
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Product Pricing & Markups</h2>
          {loading ? (
            <div className="text-center py-8 text-white/60">Loading products...</div>
          ) : products.length === 0 ? (
            <Card className="bg-white/5 border-white/20">
              <CardContent className="py-8 text-center text-white/60">
                No products found. Sync products from vendors to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => {
                const finalPrice = computeFinalPrice(
                  product.base_cost_cents,
                  product.markup_fixed_cents,
                  product.markup_percent
                );

                return (
                  <Card key={product.id} className="bg-white/5 border-white/20 hover:bg-white/10 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                            <Badge variant="outline" className="text-white border-white/30">
                              {product.vendor}
                            </Badge>
                            {!product.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                            <div>
                              <p className="text-white/60 mb-1">Base Price</p>
                              <p className="text-white font-medium">{formatCurrency(product.base_cost_cents)}</p>
                            </div>
                            <div>
                              <p className="text-white/60 mb-1">Fixed Markup</p>
                              <p className="text-white font-medium">
                                {formatCurrency(product.markup_fixed_cents || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-white/60 mb-1">Markup %</p>
                              <p className="text-white font-medium">{product.markup_percent || 0}%</p>
                            </div>
                            <div>
                              <p className="text-white/60 mb-1">Final Price</p>
                              <p className="text-white font-bold text-lg">{formatCurrency(finalPrice)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleEdit(product)}
                          size="sm"
                          variant="outline"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="bg-gray-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Edit Pricing Markup</DialogTitle>
            <DialogDescription className="text-white/60">
              {editingProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-white/60 mb-1">Base Price (Vendor)</p>
                <p className="text-xl font-semibold">{formatCurrency(editingProduct.base_cost_cents)}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="markup_fixed" className="text-white">
                    Fixed Markup (in cents)
                  </Label>
                  <Input
                    id="markup_fixed"
                    type="number"
                    value={editForm.markup_fixed_cents}
                    onChange={(e) => setEditForm({ ...editForm, markup_fixed_cents: parseInt(e.target.value) || 0 })}
                    className="bg-white/10 border-white/20 text-white mt-2"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Add a fixed amount to the price (e.g., 50 cents = $0.50)
                  </p>
                </div>

                <div>
                  <Label htmlFor="markup_percent" className="text-white">
                    Percentage Markup (%)
                  </Label>
                  <Input
                    id="markup_percent"
                    type="number"
                    step="0.01"
                    value={editForm.markup_percent}
                    onChange={(e) => setEditForm({ ...editForm, markup_percent: parseFloat(e.target.value) || 0 })}
                    className="bg-white/10 border-white/20 text-white mt-2"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Add a percentage to the base price (e.g., 20 = 20% markup)
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-white/60 mb-1">Final Customer Price</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(
                    computeFinalPrice(
                      editingProduct.base_cost_cents,
                      editForm.markup_fixed_cents,
                      editForm.markup_percent
                    )
                  )}
                </p>
                <p className="text-xs text-white/60 mt-2">
                  Base + ({editForm.markup_percent}% × Base) + ${(editForm.markup_fixed_cents / 100).toFixed(2)}
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setEditingProduct(null)}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMarkup}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Markup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
