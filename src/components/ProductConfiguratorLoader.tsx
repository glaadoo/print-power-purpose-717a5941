import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricing = async () => {
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

    fetchPricing();
  }, [productId]);

  // Don't show anything if no pricing data available
  if (!loading && productData && (!productData.pricing_data || !Array.isArray(productData.pricing_data) || productData.pricing_data.length === 0)) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-white/80">Loading options…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-300">Failed to load options: {error}</p>;
  }

  if (!productData?.pricing_data) {
    return null;
  }

  return (
    <div className="w-full space-y-2">
      <ProductConfigurator
        productId={productId}
        vendorProductId={productData.vendor_product_id || productId}
        storeCode={9}
        pricingData={productData.pricing_data}
        onPriceChange={onPriceChange}
        onConfigChange={onConfigChange}
      />
    </div>
  );
}
