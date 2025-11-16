import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductConfigurator } from "@/components/ProductConfigurator";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Auto-fetch pricing data when component mounts to prepare for immediate display
  useEffect(() => {
    fetchPricing();
  }, [productId]);

  const fetchPricing = async () => {
    if (productData || loading) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("products")
      .select("pricing_data, vendor_product_id, vendor")
      .eq("id", productId)
      .maybeSingle();
    if (error) {
      console.error('[ProductConfiguratorLoader] Error fetching pricing:', error);
      setError(error.message);
    } else {
      console.log('[ProductConfiguratorLoader] Fetched product data:', data);
      setProductData(data);
    }
    setLoading(false);
  };

  const handleToggle = () => {
    setVisible(!visible);
  };

  return (
    <div className="w-full space-y-3">
      {!visible && (
        <Button
          type="button"
          variant="outline"
          className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"
          onClick={handleToggle}
        >
          Configure Options
        </Button>
      )}

      {visible && (
        <div className="w-full space-y-2">
          {loading && <p className="text-sm text-white/80">Loading options…</p>}
          {error && (
            <p className="text-sm text-red-300">Failed to load options: {error}</p>
          )}
          {!loading && !error && productData?.pricing_data && Array.isArray(productData.pricing_data) && productData.pricing_data.length > 0 ? (
            <ProductConfigurator
              productId={productId}
              vendorProductId={productData.vendor_product_id || productId}
              storeCode={9}
              pricingData={productData.pricing_data}
              onPriceChange={onPriceChange}
              onConfigChange={onConfigChange}
            />
          ) : !loading && !error ? (
            <p className="text-sm text-white/70">No configuration options available for this product.</p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleToggle}
          >
            Hide Options
          </Button>
        </div>
      )}
    </div>
  );
}
