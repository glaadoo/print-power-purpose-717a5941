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
  const [visible, setVisible] = useState(false);

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
      setError(error.message);
    } else {
      setProductData(data);
    }
    setLoading(false);
  };

  const handleToggle = () => {
    setVisible((v) => !v);
    if (!visible && !productData) {
      fetchPricing();
    }
  };

  useEffect(() => {
    if (visible && !productData && !loading) {
      fetchPricing();
    }
  }, [visible]);

  // Don't show button if no pricing data available after fetch
  if (visible && !loading && productData && (!productData.pricing_data || !Array.isArray(productData.pricing_data) || productData.pricing_data.length === 0)) {
    return null;
  }

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
          {!loading && !error && productData?.pricing_data && Array.isArray(productData.pricing_data) && productData.pricing_data.length > 0 && (
            <ProductConfigurator
              productId={productId}
              vendorProductId={productData.vendor_product_id || productId}
              storeCode={9}
              pricingData={productData.pricing_data}
              onPriceChange={onPriceChange}
              onConfigChange={onConfigChange}
            />
          )}
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
