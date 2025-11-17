import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const StripeModeIndicator = () => {
  const [stripeMode, setStripeMode] = useState<"test" | "live">("test");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStripeMode();
    
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

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={stripeMode === "live" ? "destructive" : "default"}
        className={`
          flex items-center gap-2 px-6 py-3 font-bold shadow-2xl border-2
          ${stripeMode === "live" 
            ? "bg-red-600 text-white border-red-400 text-base animate-pulse" 
            : "bg-green-600 text-white border-green-400 text-sm"
          }
        `}
      >
        {stripeMode === "live" ? (
          <>
            <AlertCircle className="h-6 w-6" />
            <span className="tracking-wide">🔴 LIVE MODE - REAL PAYMENTS</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            TEST MODE
          </>
        )}
      </Badge>
    </div>
  );
};
