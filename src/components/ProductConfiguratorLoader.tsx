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
  const [pricingData, setPricingData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const fetchPricing = async () => {
    if (pricingData || loading) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("products")
      .select("pricing_data")
      .eq("id", productId)
      .maybeSingle();
    if (error) setError(error.message);
    else setPricingData(data?.pricing_data ?? null);
    setLoading(false);
  };

  const handleToggle = async () => {
    setVisible((v) => !v);
  };

  useEffect(() => {
    if (visible && !pricingData) {
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
        <div className="w-full">
          {loading && <p className="text-sm text-white/80">Loading options…</p>}
          {error && (
            <p className="text-sm text-red-300">Failed to load options: {error}</p>
          )}
          {pricingData && Array.isArray(pricingData) && pricingData.length > 0 ? (
            <ProductConfigurator
              pricingData={pricingData}
              onPriceChange={onPriceChange}
              onConfigChange={onConfigChange}
            />
          ) : (
            !loading && !error && (
              <p className="text-sm text-white/70">No configurable options available.</p>
            )
          )}
        </div>
      )}
    </div>
  );
}
