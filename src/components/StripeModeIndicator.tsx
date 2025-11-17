import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const StripeModeIndicator = () => {
  const [stripeMode, setStripeMode] = useState<"test" | "live">("test");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStripeMode();
    
    // Refetch when page becomes visible (handles back button)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStripeMode();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Subscribe to changes in app_settings
    const channel = supabase
      .channel('stripe-mode-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.stripe_mode'
        },
        (payload) => {
          if (payload.new && 'value' in payload.new) {
            setStripeMode(payload.new.value as "test" | "live");
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStripeMode = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stripe_mode")
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setStripeMode(data.value as "test" | "live");
      }
    } catch (error) {
      console.error("Error fetching Stripe mode:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // Only show indicator when in live mode OR explicitly in test mode
  // Live mode: Red, prominent, pulsing
  // Test mode: Green, clear visibility
  
  if (stripeMode === "live") {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Badge 
          variant="destructive"
          className="flex items-center gap-2 px-6 py-3 font-bold shadow-2xl border-2 bg-red-600 text-white border-red-400 text-base animate-pulse"
        >
          <AlertCircle className="h-6 w-6" />
          <span className="tracking-wide">🔴 LIVE MODE - REAL PAYMENTS</span>
        </Badge>
      </div>
    );
  }

  // Test mode indicator
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant="default"
        className="flex items-center gap-2 px-6 py-3 font-bold shadow-lg border-2 bg-green-600 text-white border-green-400 text-sm"
      >
        <CheckCircle2 className="h-5 w-5" />
        <span className="tracking-wide">✓ TEST MODE</span>
      </Badge>
    </div>
  );
};
