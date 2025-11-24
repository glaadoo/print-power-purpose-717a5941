import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";

interface StockNotificationFormProps {
  productId: string;
  productName: string;
  color: string;
  size: string;
  vendor: string;
  onSuccess?: () => void;
}

export default function StockNotificationForm({
  productId,
  productName,
  color,
  size,
  vendor,
  onSuccess,
}: StockNotificationFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("request-stock-notification", {
        body: {
          email: email.trim(),
          productId,
          productName,
          color,
          size,
          vendor,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setSubmitted(true);
        toast.success("You'll be notified when this item is back in stock!");
        onSuccess?.();
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setEmail("");
          setSubmitted(false);
        }, 3000);
      } else {
        throw new Error(data?.error || "Failed to submit notification request");
      }
    } catch (error: any) {
      console.error("[StockNotificationForm] Error:", error);
      toast.error(error.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <Check className="w-5 h-5 text-green-400" />
        <p className="text-sm text-green-200">
          We'll notify you when <span className="font-semibold capitalize">{color}</span> in <span className="font-semibold uppercase">{size}</span> is back!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="flex items-start gap-2">
        <Bell className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-200 font-medium mb-2">
            Notify me when <span className="capitalize">{color}</span> in <span className="uppercase">{size}</span> is back in stock
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full whitespace-nowrap"
              size="sm"
            >
              {loading ? "Submitting..." : "Notify Me"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
