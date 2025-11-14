import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductConfigurator } from "@/components/ProductConfigurator";

interface LoaderProps {
  productId: string;
  pricingData?: any;
  vendorProductId?: string;
  vendor?: string;
  onPriceChange: (priceCents: number) => void;
  onConfigChange: (config: Record<string, string>) => void;
}

export default function ProductConfiguratorLoader({
  productId,
  pricingData,
  vendorProductId,
  vendor,
  onPriceChange,
  onConfigChange,
}: LoaderProps) {
  const [visible, setVisible] = useState(false);

  const handleToggle = () => {
    setVisible((v) => !v);
  };

  // If no pricing data available, don't show configurator
  if (!pricingData || !Array.isArray(pricingData) || pricingData.length === 0) {
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
          Configure Options
        </Button>
      )}

      {visible && (
        <div className="w-full space-y-2">
          <ProductConfigurator
            productId={productId}
            vendorProductId={vendorProductId || productId}
            storeCode={9}
            pricingData={pricingData}
            onPriceChange={onPriceChange}
            onConfigChange={onConfigChange}
          />
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
