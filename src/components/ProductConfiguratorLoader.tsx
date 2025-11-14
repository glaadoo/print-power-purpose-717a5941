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
    console.log('[ProductConfiguratorLoader] Fetching pricing for product:', productId);
    const { data, error } = await supabase
      .from("products")
      .select("pricing_data")
      .eq("id", productId)
      .maybeSingle();
    console.log('[ProductConfiguratorLoader] Response:', { data, error });
    if (error) {
      console.error('[ProductConfiguratorLoader] Error:', error);
      setError(error.message);
    } else {
      console.log('[ProductConfiguratorLoader] Pricing data:', data?.pricing_data);
      setPricingData(data?.pricing_data ?? null);
    }
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
        <div className="w-full space-y-2">
          {loading && <p className="text-sm text-white/80">Loading options…</p>}
          {error && (
            <p className="text-sm text-red-300">Failed to load options: {error}</p>
          )}
          {!loading && !error && pricingData && Array.isArray(pricingData) && pricingData.length > 0 ? (
            <div className="space-y-2">
              <ProductConfigurator
                pricingData={pricingData}
                onPriceChange={onPriceChange}
                onConfigChange={onConfigChange}
              />
              <details className="text-xs text-white/50">
                <summary className="cursor-pointer hover:text-white/70">Debug Info</summary>
                <div className="mt-2 p-2 bg-black/30 rounded">
                  <p>Pricing data structure: {pricingData.length} elements</p>
                  <p>Options: {pricingData[0]?.length || 0}</p>
                  <p>Combinations: {pricingData[1]?.length || 0}</p>
                  <p>Has attributes: {pricingData[1]?.[0]?.attributes ? 'Yes' : 'No'}</p>
                </div>
              </details>
            </div>
          ) : !loading && !error ? (
            <div className="text-sm text-white/70 space-y-2 p-3 bg-amber-900/20 border border-amber-600/30 rounded">
              <p className="font-semibold">⚠️ Configuration unavailable</p>
              <p className="text-xs">This product's pricing data doesn't include option-to-price mappings needed for the configurator.</p>
              <p className="text-xs">The product can still be ordered at the base price shown above.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
