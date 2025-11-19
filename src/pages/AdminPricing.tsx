import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GlassCard from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, DollarSign, Percent } from "lucide-react";

export default function AdminPricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pricing settings state
  const [markupMode, setMarkupMode] = useState<"fixed" | "percent">("fixed");
  const [markupFixed, setMarkupFixed] = useState("15.00");
  const [markupPercent, setMarkupPercent] = useState("30");
  const [nonprofitShareMode, setNonprofitShareMode] = useState<"fixed" | "percent_of_markup">("fixed");
  const [nonprofitFixed, setNonprofitFixed] = useState("10.00");
  const [nonprofitPercent, setNonprofitPercent] = useState("70");

  // Preview calculation
  const [previewBaseCost, setPreviewBaseCost] = useState("50.00");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("*")
        .eq("vendor", "sinalite")
        .single();

      if (error) throw error;

      if (data) {
        setMarkupMode(data.markup_mode as "fixed" | "percent");
        setMarkupFixed((data.markup_fixed_cents / 100).toFixed(2));
        setMarkupPercent(data.markup_percent.toString());
        setNonprofitShareMode(data.nonprofit_share_mode as "fixed" | "percent_of_markup");
        setNonprofitFixed((data.nonprofit_fixed_cents / 100).toFixed(2));
        setNonprofitPercent(data.nonprofit_percent_of_markup.toString());
      }
    } catch (error) {
      console.error("Error loading pricing settings:", error);
      toast.error("Failed to load pricing settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const markup_fixed_cents = Math.round(parseFloat(markupFixed) * 100);
      const markup_percent = parseFloat(markupPercent);
      const nonprofit_fixed_cents = Math.round(parseFloat(nonprofitFixed) * 100);
      const nonprofit_percent_of_markup = parseFloat(nonprofitPercent);

      console.log("[PPP:PRICING:ADMIN] Updating SinaLite pricing settings", {
        markup_mode: markupMode,
        markup_fixed_cents,
        markup_percent,
        nonprofit_share_mode: nonprofitShareMode,
        nonprofit_fixed_cents,
        nonprofit_percent_of_markup,
      });

      const { error } = await supabase
        .from("pricing_settings")
        .update({
          markup_mode: markupMode,
          markup_fixed_cents,
          markup_percent,
          nonprofit_share_mode: nonprofitShareMode,
          nonprofit_fixed_cents,
          nonprofit_percent_of_markup,
          updated_at: new Date().toISOString(),
        })
        .eq("vendor", "sinalite");

      if (error) throw error;

      toast.success("Pricing settings updated successfully");
    } catch (error) {
      console.error("Error saving pricing settings:", error);
      toast.error("Failed to save pricing settings");
    } finally {
      setSaving(false);
    }
  }

  // Calculate preview
  function calculatePreview() {
    const baseCostCents = Math.round(parseFloat(previewBaseCost) * 100);
    
    let markupAmountCents: number;
    if (markupMode === "fixed") {
      markupAmountCents = Math.round(parseFloat(markupFixed) * 100);
    } else {
      markupAmountCents = Math.round(baseCostCents * (parseFloat(markupPercent) / 100));
    }

    let donationCents: number;
    if (nonprofitShareMode === "fixed") {
      donationCents = Math.min(markupAmountCents, Math.round(parseFloat(nonprofitFixed) * 100));
    } else {
      donationCents = Math.round(markupAmountCents * (parseFloat(nonprofitPercent) / 100));
    }

    const grossMarginCents = Math.max(0, markupAmountCents - donationCents);
    const finalPriceCents = baseCostCents + markupAmountCents;

    return {
      baseCost: (baseCostCents / 100).toFixed(2),
      markup: (markupAmountCents / 100).toFixed(2),
      donation: (donationCents / 100).toFixed(2),
      grossMargin: (grossMarginCents / 100).toFixed(2),
      finalPrice: (finalPriceCents / 100).toFixed(2),
    };
  }

  const preview = calculatePreview();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Loading pricing settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Global Pricing Settings</h1>
            <p className="text-white/60 mt-1">
              Configure markup and nonprofit share for all SinaLite products
            </p>
          </div>
        </div>

        {/* Markup Configuration */}
        <GlassCard className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Markup Configuration
            </h2>
            <p className="text-sm text-white/60 mb-6">
              Set how much to mark up SinaLite wholesale prices
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="markup-mode">Markup Type</Label>
              <Select value={markupMode} onValueChange={(v) => setMarkupMode(v as any)}>
                <SelectTrigger id="markup-mode" className="rounded-full bg-white/10 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed amount per unit ($)</SelectItem>
                  <SelectItem value="percent">Percentage of base cost (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {markupMode === "fixed" ? (
              <div>
                <Label htmlFor="markup-fixed">Markup Amount (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    id="markup-fixed"
                    type="number"
                    step="0.01"
                    value={markupFixed}
                    onChange={(e) => setMarkupFixed(e.target.value)}
                    className="rounded-full pl-10 bg-white/10 border-white/20"
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Fixed dollar amount added to each unit
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="markup-percent">Markup Percentage (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    id="markup-percent"
                    type="number"
                    step="1"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                    className="rounded-full pl-10 bg-white/10 border-white/20"
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Percentage of base cost to add as markup
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Nonprofit Share Configuration */}
        <GlassCard className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Nonprofit Share</h2>
            <p className="text-sm text-white/60 mb-6">
              Configure how much of the markup goes to the selected nonprofit
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nonprofit-mode">Share Type</Label>
              <Select
                value={nonprofitShareMode}
                onValueChange={(v) => setNonprofitShareMode(v as any)}
              >
                <SelectTrigger id="nonprofit-mode" className="rounded-full bg-white/10 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed amount per unit ($)</SelectItem>
                  <SelectItem value="percent_of_markup">Percent of markup (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {nonprofitShareMode === "fixed" ? (
              <div>
                <Label htmlFor="nonprofit-fixed">Amount to Nonprofit (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    id="nonprofit-fixed"
                    type="number"
                    step="0.01"
                    value={nonprofitFixed}
                    onChange={(e) => setNonprofitFixed(e.target.value)}
                    className="rounded-full pl-10 bg-white/10 border-white/20"
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Fixed dollar amount donated per unit sold
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="nonprofit-percent">Percent of Markup to Nonprofit (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    id="nonprofit-percent"
                    type="number"
                    step="1"
                    value={nonprofitPercent}
                    onChange={(e) => setNonprofitPercent(e.target.value)}
                    className="rounded-full pl-10 bg-white/10 border-white/20"
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Percentage of markup donated to nonprofit
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Preview Calculator */}
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Preview Calculator</h2>
          <p className="text-sm text-white/60">
            Enter a sample base cost to see how pricing will be calculated
          </p>

          <div>
            <Label htmlFor="preview-base">Sample Base Cost (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                id="preview-base"
                type="number"
                step="0.01"
                value={previewBaseCost}
                onChange={(e) => setPreviewBaseCost(e.target.value)}
                className="rounded-full pl-10 bg-white/10 border-white/20"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/10">
            <div className="flex justify-between">
              <span className="text-white/60">Base Cost:</span>
              <span className="font-semibold">${preview.baseCost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Markup:</span>
              <span className="font-semibold text-blue-400">+${preview.markup}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Donation per Unit:</span>
              <span className="font-semibold text-green-400">${preview.donation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Gross Margin per Unit:</span>
              <span className="font-semibold text-purple-400">${preview.grossMargin}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="font-semibold">Final Customer Price:</span>
              <span className="text-xl font-bold">${preview.finalPrice}</span>
            </div>
          </div>
        </GlassCard>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/admin")}
            className="rounded-full border-white/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-blue-600 hover:bg-blue-700"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <div className="text-xs text-white/40 text-center py-4">
          <p>
            Note: SinaLite products will use these global settings. Per-product markups are
            ignored for SinaLite items.
          </p>
        </div>
      </div>
    </div>
  );
}
