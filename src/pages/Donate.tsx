import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoBackground from "@/components/VideoBackground";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import { invokeWithRetry } from "@/lib/api-retry";
import { useCause } from "@/context/CauseContext";

const PRESET_AMOUNTS = [140, 70, 40, 25, 15, 8];

export default function Donate() {
  const nav = useNavigate();
  const { nonprofit } = useCause();
  
  const [amount, setAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [donorEmail, setDonorEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [showMonthlyUpsell, setShowMonthlyUpsell] = useState(false);

  useEffect(() => {
    document.title = "Donate - Print Power Purpose";
  }, []);

  const handlePresetClick = (preset: number) => {
    setSelectedPreset(preset);
    setAmount(preset.toString());
  };

  const handleCustomAmountChange = (value: string) => {
    setAmount(value);
    setSelectedPreset(null);
  };

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nonprofit) return;
    
    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount <= 0) {
      toast.error("Please enter a valid donation amount");
      return;
    }

    if (!donorEmail || !donorEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Show monthly upsell for one-time donations
    if (frequency === "once") {
      setShowMonthlyUpsell(true);
      return;
    }

    // Process donation directly for monthly
    await processDonation();
  };

  const processDonation = async () => {
    if (!nonprofit) return;
    
    const donationAmount = parseFloat(amount);
    const finalAmount = donationAmount;
    
    setProcessing(true);

    try {
      if (frequency === "monthly") {
        // Create Stripe checkout session for monthly recurring donation
        const { data, error } = await invokeWithRetry(
          supabase,
          "create-monthly-donation",
          {
            body: {
              nonprofitId: nonprofit.id,
              nonprofitName: nonprofit.name,
              nonprofitEin: nonprofit.ein,
              amountCents: Math.round(finalAmount * 100),
              customerEmail: donorEmail,
            },
          }
        );

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      } else {
        // Create Stripe checkout session for one-time donation
        const { data, error } = await invokeWithRetry(
          supabase,
          "checkout-session",
          {
            body: {
              productName: `Donation to ${nonprofit.name}`,
              unitAmountCents: Math.round(finalAmount * 100),
              quantity: 1,
              nonprofitId: nonprofit.id,
              nonprofitName: nonprofit.name,
              nonprofitEin: nonprofit.ein,
              donationUsd: finalAmount,
              currency: "usd",
              successPath: `/?payment=success`,
              cancelPath: `/donate?payment=cancelled`,
            },
          }
        );

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned");
        }
      }
    } catch (err: any) {
      console.error("Donation error:", err);
      toast.error(err.message || "Failed to process donation. Please try again.");
      setProcessing(false);
    }
  };

  if (!nonprofit) {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden flex flex-col">
        <header className="px-4 md:px-6 py-4 flex items-center justify-between text-white backdrop-blur-md bg-black/30 border-b border-white/10 shrink-0">
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-2 rounded-full px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/30"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="text-sm md:text-base font-semibold uppercase tracking-[0.2em]">
            DONATE
          </div>
          
          <div className="w-20" />
        </header>

        <div className="flex-1 overflow-hidden relative">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/60" />}
          />
          
          <div className="relative w-full h-full flex items-center justify-center p-6">
            <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-white">
              <h1 className="text-3xl font-bold mb-4">Make a Donation</h1>
              <p className="text-white/80 mb-8">
                To make a donation, please first select a nonprofit you'd like to support.
              </p>
              <Button
                onClick={() => nav("/select/nonprofit")}
                className="w-full bg-white text-black hover:bg-white/90 font-semibold py-6 text-lg rounded-full"
              >
                Select Nonprofit
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden flex flex-col">
      <header className="px-4 md:px-6 py-4 flex items-center justify-center text-white backdrop-blur-md bg-black/30 border-b border-white/10 shrink-0 relative">
        <Button
          onClick={() => nav(-1)}
          variant="ghost"
          className="absolute left-4 text-white hover:bg-white/10 rounded-full"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="text-sm md:text-base font-semibold uppercase tracking-[0.2em]">
          DONATIONS
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/60" />}
        />

        <div className="relative w-full h-full grid lg:grid-cols-2">
          {/* Left Column - Nonprofit Info (Scrollable) */}
          <div className="bg-white/5 backdrop-blur-md border-r border-white/10 text-white flex flex-col overflow-hidden">
            <div className="p-6 md:p-10 overflow-y-auto space-y-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {nonprofit.name}
                </h1>
                
                <p className="text-white/80 text-base mb-6">
                  Support local animal shelters and rescue operations
                </p>
              </div>

              {/* Progress Section */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold">$27</span>
                    <span className="text-white/60 text-sm">raised of $1,500 goal</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full rounded-full transition-all"
                      style={{ width: '2%' }}
                    />
                  </div>
                  
                  <p className="text-white/60 text-sm mt-2">2% funded</p>
                </div>

                <div className="space-y-2 pt-4">
                  <p className="text-white/90">
                    Your donation helps make a direct impact on this cause.
                  </p>
                  <p className="text-white/80 text-sm">
                    100% of your contribution goes directly to supporting this initiative.
                  </p>
                </div>
              </div>

              {/* Recent Donations */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Recent Donations</h3>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold">
                      S
                    </div>
                    <span className="text-white font-medium">Sd2342</span>
                  </div>
                  <span className="text-white font-semibold">$9</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Donation Form (Scrollable) */}
          <div className="bg-white/5 backdrop-blur-sm overflow-y-auto">
            <div className="p-6 md:p-10">
              {/* Secure Donation Header */}
              <div className="flex items-center gap-2 mb-6">
                <Lock className="h-5 w-5 text-green-400" />
                <h2 className="text-xl font-bold text-white">Secure Donation</h2>
              </div>

              {/* Monthly Upsell Modal */}
              {showMonthlyUpsell && (
                <div className="mb-6 p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-3">
                    Make this a monthly gift?
                  </h3>
                  <p className="text-white/80 mb-4">
                    Monthly donations provide sustainable support and make a bigger impact over time.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setFrequency("monthly");
                        setShowMonthlyUpsell(false);
                        processDonation();
                      }}
                      className="flex-1 bg-white text-black hover:bg-white/90 rounded-full"
                    >
                      Yes, Make it Monthly
                    </Button>
                    <Button
                      onClick={() => {
                        setShowMonthlyUpsell(false);
                        processDonation();
                      }}
                      variant="outline"
                      className="flex-1 border-white/30 text-white hover:bg-white/10 rounded-full"
                    >
                      No, One-Time Only
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleDonate} className="space-y-6">
                {/* Frequency Toggle */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFrequency("once")}
                    className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all ${
                      frequency === "once"
                        ? "bg-white text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    Give once
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency("monthly")}
                    className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all ${
                      frequency === "monthly"
                        ? "bg-white text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    ❤️ Monthly
                  </button>
                </div>

                {/* Preset Amount Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className={`px-6 py-4 rounded-full font-semibold transition-all border-2 ${
                        selectedPreset === preset
                          ? "bg-white/20 text-white border-white/50"
                          : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Or enter custom amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      value={amount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      placeholder="15"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-full pl-8 pr-20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 text-sm">
                      USD
                    </span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white text-sm mb-2 font-medium">
                    Your Email
                  </label>
                  <Input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="donor@example.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-full"
                    required
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-white text-black hover:bg-white/90 font-bold py-6 text-lg rounded-full"
                >
                  {processing ? "Processing..." : "Donate"}
                </Button>

                {/* Footer Text */}
                <p className="text-center text-white/50 text-xs">
                  Secure payment · Tax-deductible · Cancel anytime
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
