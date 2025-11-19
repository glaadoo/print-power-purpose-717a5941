import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, RefreshCw, Edit, Save, X, CheckSquare } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [pricingSettings, setPricingSettings] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkMarkupType, setBulkMarkupType] = useState<"fixed" | "percent">("fixed");
  const [bulkMarkupValue, setBulkMarkupValue] = useState<string>("");

  useEffect(() => {
    loadProducts();
    loadPricingSettings();
  }, []);

  async function loadPricingSettings() {
    try {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("*")
        .eq("vendor", "sinalite")
        .maybeSingle();
      
      if (error) throw error;
      setPricingSettings(data || {
        markup_mode: "fixed",
        markup_fixed_cents: 1500,
        markup_percent: 0,
        nonprofit_share_mode: "fixed",
        nonprofit_fixed_cents: 1000,
        nonprofit_percent_of_markup: 0,
      });
    } catch (err) {
      console.error("Error loading pricing settings:", err);
    }
  }

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

  function toggleSelectAll() {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  }

  function toggleSelectProduct(productId: string) {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  }

  async function handleBulkMarkupApply() {
    if (selectedProducts.size === 0) {
      toast.error("Please select at least one product");
      return;
    }

    const value = parseFloat(bulkMarkupValue);
    if (isNaN(value) || value < 0) {
      toast.error("Please enter a valid markup value");
      return;
    }

    try {
      const updates = Array.from(selectedProducts).map(productId => {
        const updateData = bulkMarkupType === "fixed"
          ? { markup_fixed_cents: Math.round(value * 100), markup_percent: 0 }
          : { markup_percent: value, markup_fixed_cents: 0 };

        return supabase
          .from("products")
          .update(updateData)
          .eq("id", productId);
      });

      await Promise.all(updates);
      
      toast.success(`Updated ${selectedProducts.size} products successfully`);
      setSelectedProducts(new Set());
      setBulkMarkupValue("");
      loadProducts();
    } catch (err) {
      console.error("Error applying bulk markup:", err);
      toast.error("Failed to apply bulk markup");
    }
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

  // Calculate pricing analytics
  const analytics = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.is_active).length,
    avgBaseCost: products.length > 0 
      ? products.reduce((sum, p) => sum + p.base_cost_cents, 0) / products.length / 100
      : 0,
    avgFinalPrice: products.length > 0
      ? products.reduce((sum, p) => {
          const finalPrice = computeFinalPrice(
            p.base_cost_cents,
            p.markup_fixed_cents || 0,
            p.markup_percent || 0
          );
          return sum + finalPrice;
        }, 0) / products.length / 100
      : 0,
    sinaliteCount: products.filter(p => p.vendor === 'sinalite').length,
  };

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

        {/* Pricing Analytics Widget */}
        <div className="mb-8">
          <Card className="border-white/20 bg-white/5 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Pricing Analytics
              </CardTitle>
              <CardDescription className="text-white/70">
                Overview of product pricing across all vendors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Total Products</div>
                  <div className="text-2xl font-bold text-white">{analytics.totalProducts}</div>
                  <div className="text-white/40 text-xs mt-1">
                    {analytics.activeProducts} active
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Avg Base Cost</div>
                  <div className="text-2xl font-bold text-white">
                    ${analytics.avgBaseCost.toFixed(2)}
                  </div>
                  <div className="text-white/40 text-xs mt-1">Wholesale price</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Avg Final Price</div>
                  <div className="text-2xl font-bold text-white">
                    ${analytics.avgFinalPrice.toFixed(2)}
                  </div>
                  <div className="text-white/40 text-xs mt-1">With markup</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Avg Markup</div>
                  <div className="text-2xl font-bold text-green-400">
                    ${(analytics.avgFinalPrice - analytics.avgBaseCost).toFixed(2)}
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    {analytics.avgBaseCost > 0 
                      ? `${(((analytics.avgFinalPrice - analytics.avgBaseCost) / analytics.avgBaseCost) * 100).toFixed(0)}% margin`
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
              
              {pricingSettings && analytics.sinaliteCount > 0 && (
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-xs text-blue-200 font-medium mb-1">
                    SinaLite Global Pricing ({analytics.sinaliteCount} products)
                  </div>
                  <div className="text-white/70 text-xs">
                    {pricingSettings.markup_mode === 'fixed' 
                      ? `Fixed markup: $${(pricingSettings.markup_fixed_cents / 100).toFixed(2)}`
                      : `Percentage markup: ${pricingSettings.markup_percent}%`
                    }
                    {' • '}
                    {pricingSettings.nonprofit_share_mode === 'fixed'
                      ? `Nonprofit share: $${(pricingSettings.nonprofit_fixed_cents / 100).toFixed(2)}`
                      : `Nonprofit share: ${pricingSettings.nonprofit_percent_of_markup}% of markup`
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bulk Markup Section */}
        {products.length > 0 && (
          <div className="mb-8">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Bulk Markup Update
                </CardTitle>
                <CardDescription className="text-white/70">
                  Select products and apply markup to multiple items at once
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Button
                    onClick={toggleSelectAll}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 hover:bg-white/10"
                  >
                    {selectedProducts.size === products.length ? "Deselect All" : "Select All"}
                    {selectedProducts.size > 0 && ` (${selectedProducts.size})`}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Label className="text-white/90 whitespace-nowrap">Markup Type:</Label>
                    <Select value={bulkMarkupType} onValueChange={(v) => setBulkMarkupType(v as "fixed" | "percent")}>
                      <SelectTrigger className="w-32 bg-white/5 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed ($)</SelectItem>
                        <SelectItem value="percent">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-white/90 whitespace-nowrap">Value:</Label>
                    <Input
                      type="number"
                      value={bulkMarkupValue}
                      onChange={(e) => setBulkMarkupValue(e.target.value)}
                      placeholder={bulkMarkupType === "fixed" ? "15.00" : "20"}
                      className="w-24 bg-white/5 border-white/20 text-white"
                      step={bulkMarkupType === "fixed" ? "0.01" : "1"}
                      min="0"
                    />
                    <span className="text-white/70 text-sm">
                      {bulkMarkupType === "fixed" ? "USD" : "%"}
                    </span>
                  </div>

                  <Button
                    onClick={handleBulkMarkupApply}
                    disabled={selectedProducts.size === 0 || !bulkMarkupValue}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Apply to {selectedProducts.size} Selected
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                const isSelected = selectedProducts.has(product.id);
                const finalPrice = computeFinalPrice(
                  product.base_cost_cents,
                  product.markup_fixed_cents,
                  product.markup_percent
                );

                return (
                  <Card key={product.id} className="bg-white/5 border-white/20 hover:bg-white/10 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                          className="mt-1 border-white/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        
                        <div className="flex items-start justify-between gap-4 flex-1">
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
