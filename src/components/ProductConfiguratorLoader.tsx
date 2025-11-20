import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductConfigurator } from "@/components/ProductConfigurator";
import { withRetry } from "@/lib/api-retry";

interface LoaderProps {
  productId: string;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
}

export default function ProductConfiguratorLoader({
  productId,
  onPriceChange,
  onConfigChange,
}: LoaderProps) {
  const [productData, setProductData] = useState<any | null>(null);
  const [pricingOptions, setPricingOptions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const fetchPricingOptions = async () => {
    if (pricingOptions || loading) return;
    setLoading(true);
    setError(null);
    
    try {
      // First, get product metadata
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("vendor_product_id, vendor")
        .eq("id", productId)
        .maybeSingle();
      
      if (productError) throw productError;
      if (!product) throw new Error("Product not found");
      
      console.log('[ProductConfiguratorLoader] Fetching options for product:', product.vendor_product_id);
      
      // Call sinalite-price edge function to get actual pricing options
      const response = await withRetry(
        async () => {
          const { data, error } = await supabase.functions.invoke('sinalite-price', {
            body: {
              productId: product.vendor_product_id,
              storeCode: 9,
              productOptions: {} // Empty to get all available options
            }
          });
          
          if (error) throw error;
          return data;
        },
        { maxAttempts: 2, initialDelayMs: 1000 }
      );
      
      console.log('[ProductConfiguratorLoader] Received pricing response:', response);
      
      if (response?.options && Array.isArray(response.options)) {
        setPricingOptions(response.options);
        setProductData(product);
      } else {
        throw new Error("Invalid pricing data structure from API");
      }
    } catch (e: any) {
      console.error('[ProductConfiguratorLoader] Error fetching pricing options:', e);
      setError(e.message || "Failed to load configuration options");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!visible && !pricingOptions) {
      fetchPricingOptions();
    }
    setVisible(!visible);
  };

  return (
    <div className="w-full space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"
        onClick={handleToggle}
      >
        {visible ? "Hide Options" : "Configure Options"}
      </Button>

      {visible && (
        <div className="w-full space-y-2">
          {loading && <p className="text-sm text-white/80">Loading options…</p>}
          {error && (
            <p className="text-sm text-red-300">Failed to load options: {error}</p>
          )}
          {!loading && !error && pricingOptions && Array.isArray(pricingOptions) && pricingOptions.length > 0 ? (
            <ProductConfigurator
              productId={productId}
              vendorProductId={productData.vendor_product_id || productId}
              storeCode={9}
              pricingData={pricingOptions}
              onPriceChange={onPriceChange}
              onConfigChange={onConfigChange}
            />
          ) : !loading && !error ? (
            <p className="text-sm text-white/70">No configuration options available for this product.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
