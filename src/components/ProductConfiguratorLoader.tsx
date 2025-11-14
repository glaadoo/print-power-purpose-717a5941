import { useEffect, useState } from "react";
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
  const [visible, setVisible] = useState(true);

  const fetchPricing = async () => {
    if (productData || loading) return;
    setLoading(true);
    setError(null);
    console.log('[ProductConfiguratorLoader] Fetching product data:', productId);
    const { data, error } = await supabase
      .from("products")
      .select("pricing_data, vendor_product_id, vendor")
      .eq("id", productId)
      .maybeSingle();
    console.log('[ProductConfiguratorLoader] Response:', { data, error });
    if (error) {
      console.error('[ProductConfiguratorLoader] Error:', error);
      setError(error.message);
    } else {
      console.log('[ProductConfiguratorLoader] Product data:', data);
      setProductData(data);
    }
    setLoading(false);
  };

  const handleToggle = async () => {
    setVisible((v) => !v);
  };

  useEffect(() => {
    if (visible && !productData) {
      fetchPricing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <div className="w-full space-y-3">
      {!visible && (
        <Button
          type="button"
          variant="outline"
          className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20"
          onClick={handleToggle}
        >
          {loading ? "Loading options…" : "Configure Options"}
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
            <div className="text-sm text-white/70 space-y-2 p-3 bg-amber-900/20 border border-amber-600/30 rounded">
              <p className="font-semibold">⚠️ Configuration unavailable</p>
              <p className="text-xs">This product's pricing data doesn't include configurable options.</p>
              <p className="text-xs">The product can still be ordered at the base price shown above.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
