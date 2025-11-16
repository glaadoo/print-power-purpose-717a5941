import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const StripeModeToggle = () => {
  const [stripeMode, setStripeMode] = useState<"test" | "live">("test");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchStripeMode();
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
      toast.error("Failed to load Stripe mode");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    const newMode = checked ? "live" : "test";
    setUpdating(true);

    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ 
          value: newMode,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("key", "stripe_mode");

      if (error) throw error;

      setStripeMode(newMode);
      toast.success(
        `Stripe mode switched to ${newMode.toUpperCase()}`,
        {
          description: newMode === "live" 
            ? "⚠️ You are now processing real payments!" 
            : "You are now in test mode using test API keys."
        }
      );
    } catch (error) {
      console.error("Error updating Stripe mode:", error);
      toast.error("Failed to update Stripe mode");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading Stripe settings...</div>;
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Stripe Payment Mode</CardTitle>
            <CardDescription className="text-white/70">
              Switch between test and live Stripe environments
            </CardDescription>
          </div>
          <Badge 
            variant={stripeMode === "live" ? "destructive" : "secondary"}
            className="text-sm"
          >
            {stripeMode === "live" ? (
              <><AlertCircle className="h-3 w-3 mr-1" /> LIVE MODE</>
            ) : (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> TEST MODE</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Label htmlFor="stripe-mode" className="text-base text-white">
              Enable Live Mode
            </Label>
            <p className="text-sm text-white/70 mt-1">
              {stripeMode === "test" 
                ? "Currently using test API keys - no real charges will be made" 
                : "⚠️ Currently using live API keys - REAL payments are being processed"}
            </p>
          </div>
          <Switch
            id="stripe-mode"
            checked={stripeMode === "live"}
            onCheckedChange={handleToggle}
            disabled={updating}
          />
        </div>
        
        <div className="mt-4 p-3 bg-white/5 rounded-md border border-white/10">
          <p className="text-sm text-white/70">
            <strong className="text-white">Note:</strong> Make sure you have configured both{" "}
            <code className="text-xs bg-white/10 px-1 py-0.5 rounded text-white">STRIPE_SECRET_KEY_TEST</code> and{" "}
            <code className="text-xs bg-white/10 px-1 py-0.5 rounded text-white">STRIPE_SECRET_KEY_LIVE</code>{" "}
            secrets in your backend settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
