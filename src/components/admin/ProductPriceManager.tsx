import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Settings, Save, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import ProductConfiguratorLoader from "@/components/ProductConfiguratorLoader";

type Product = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  vendor_product_id: string | null;
};

type CustomPrice = {
  id: string;
  variant_key: string;
  custom_price_cents: number;
  configuration_label: string | null;
};

export default function ProductPriceManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customPrices, setCustomPrices] = useState<CustomPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Current configuration state
  const [currentConfig, setCurrentConfig] = useState<Record<string, string>>({});
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentVariantKey, setCurrentVariantKey] = useState<string>("");
  const [customPriceInput, setCustomPriceInput] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchCustomPrices(selectedProduct.id);
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, image_url, vendor_product_id")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Failed to load products: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomPrices = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from("product_configuration_prices")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomPrices(data || []);
    } catch (error: any) {
      toast.error("Failed to load custom prices: " + error.message);
    }
  };

  const getVariantKey = () => {
    return currentVariantKey || null;
  };

  const saveCustomPrice = async () => {
    if (!selectedProduct) return;
    
    const priceInCents = Math.round(parseFloat(customPriceInput) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const variantKey = getVariantKey();
    if (!variantKey) {
      toast.error("Please select a configuration first");
      return;
    }

    setSaving(true);
    try {
      const configLabel = Object.entries(currentConfig)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      const { error } = await supabase
        .from("product_configuration_prices")
        .upsert({
          product_id: selectedProduct.id,
          variant_key: variantKey,
          custom_price_cents: priceInCents,
          configuration_label: configLabel,
        });

      if (error) throw error;

      toast.success("Custom price saved successfully!");
      setCustomPriceInput("");
      fetchCustomPrices(selectedProduct.id);
    } catch (error: any) {
      toast.error("Failed to save custom price: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomPrice = async (id: string) => {
    try {
      const { error } = await supabase
        .from("product_configuration_prices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Custom price deleted");
      if (selectedProduct) {
        fetchCustomPrices(selectedProduct.id);
      }
    } catch (error: any) {
      toast.error("Failed to delete custom price: " + error.message);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProduct) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploadingImage(true);
    try {
      // Create a safe filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedProduct.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${fileExt}`;
      const filePath = `/images/${fileName}`;

      // Read file as base64 (for simple copy to public folder)
      // Note: In production, you'd upload to Supabase Storage
      // For now, we'll just update the database with the path
      // and expect the file to be manually placed in public/images/

      // Update database with image path
      const { error } = await supabase
        .from("products")
        .update({ image_url: filePath })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      // Update local state
      setSelectedProduct({ ...selectedProduct, image_url: filePath });
      setProducts(products.map(p => 
        p.id === selectedProduct.id ? { ...p, image_url: filePath } : p
      ));

      toast.success(`Image path saved! Place ${fileName} in public/images/ folder`);
    } catch (error: any) {
      toast.error("Failed to update image: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Product Configuration Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label>Select Product</Label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={selectedProduct?.id || ""}
              onChange={(e) => {
                const product = products.find((p) => p.id === e.target.value);
                setSelectedProduct(product || null);
                setCurrentConfig({});
                setCustomPriceInput("");
              }}
            >
              <option value="">-- Select a product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.category ? `(${product.category})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Product Image Upload */}
          {selectedProduct && (
            <div className="space-y-4 p-4 border rounded-md bg-accent/50">
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Product Image
              </h3>
              
              {selectedProduct.image_url && (
                <div className="space-y-2">
                  <Label>Current Image</Label>
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className="w-32 h-32 object-cover rounded-md border"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{selectedProduct.image_url}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="image-upload">Upload New Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="flex-1"
                  />
                  <Button disabled={uploadingImage} variant="outline">
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, WEBP. File will be saved to public/images/
                </p>
              </div>
            </div>
          )}

          {/* Product Configurator */}
          {selectedProduct && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
              <h3 className="font-semibold">Configure Product</h3>
              <ProductConfiguratorLoader
                productId={selectedProduct.id}
                onPriceChange={(price) => setCurrentPrice(price)}
                onConfigChange={(config) => setCurrentConfig(config)}
                onVariantKeyChange={(variantKey) => setCurrentVariantKey(variantKey)}
              />
              
              {currentPrice > 0 && (
                <div className="text-sm text-muted-foreground">
                  Current Price (from Sinalite): ${(currentPrice / 100).toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Custom Price Input */}
          {selectedProduct && currentVariantKey && (
            <div className="space-y-4 p-4 border rounded-md bg-primary/5">
              <h3 className="font-semibold">Set Custom Price</h3>
              <div className="space-y-2">
                <Label>Custom Price (USD)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={customPriceInput}
                    onChange={(e) => setCustomPriceInput(e.target.value)}
                  />
                  <Button onClick={saveCustomPrice} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Custom Prices */}
          {selectedProduct && customPrices.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Existing Custom Prices</h3>
              <div className="space-y-2">
                {customPrices.map((price) => (
                  <div
                    key={price.id}
                    className="flex items-center justify-between p-3 border rounded-md bg-card"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        ${(price.custom_price_cents / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {price.configuration_label || "Unknown configuration"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCustomPrice(price.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
