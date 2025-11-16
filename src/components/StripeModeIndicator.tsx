import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export const StripeModeIndicator = () => {
  // Read from environment variable
  const stripeMode = import.meta.env.VITE_STRIPE_MODE || "test";
  const isTestMode = stripeMode === "test";

  if (!isTestMode) {
    return null; // Don't show indicator in live mode
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge 
        variant="destructive" 
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold shadow-lg"
      >
        <AlertCircle className="h-4 w-4" />
        STRIPE TEST MODE
      </Badge>
    </div>
  );
};
