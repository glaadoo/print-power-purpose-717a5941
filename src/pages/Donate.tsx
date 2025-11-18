import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoBackground from "@/components/VideoBackground";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { calculateWithTransactionFees } from "@/lib/donation-utils";
import { invokeWithRetry } from "@/lib/api-retry";
import { useCause } from "@/context/CauseContext";

export default function Donate() {
  const nav = useNavigate();
  const { nonprofit } = useCause();
  
  const [amount, setAmount] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [showMonthlyUpsell, setShowMonthlyUpsell] = useState(false);
  const [donorFirstName, setDonorFirstName] = useState("");
  const [donorLastName, setDonorLastName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorStreetAddress, setDonorStreetAddress] = useState("");
  const [donorApartment, setDonorApartment] = useState("");
  const [donorCity, setDonorCity] = useState("");
  const [donorState, setDonorState] = useState("");
  const [donorZipCode, setDonorZipCode] = useState("");
  const [donorCountry, setDonorCountry] = useState("United States");
  const [coverTransactionCosts, setCoverTransactionCosts] = useState(true);

  useEffect(() => {
    document.title = "Donate - Print Power Purpose";
  }, []);

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
    let finalAmount = donationAmount;
    
    // Add transaction costs if checked
    if (coverTransactionCosts) {
      finalAmount = calculateWithTransactionFees(donationAmount);
    }
    
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
              firstName: donorFirstName,
              lastName: donorLastName,
              phone: donorPhone,
              address: {
                street: donorStreetAddress,
                apartment: donorApartment,
                city: donorCity,
                state: donorState,
                zipCode: donorZipCode,
                country: donorCountry,
              },
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
      <header className="px-4 md:px-6 py-4 flex items-center justify-between text-white backdrop-blur-md bg-black/30 border-b border-white/10 shrink-0 relative">
        <Button
          onClick={() => nav(-1)}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="absolute left-1/2 -translate-x-1/2 text-sm md:text-base font-semibold uppercase tracking-[0.2em]">
          DONATIONS
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

        <div className="relative w-full h-full grid lg:grid-cols-2">
          {/* Left Column - Nonprofit Info (Scrollable) */}
          <div className="bg-white/10 backdrop-blur-md border-r border-white/20 text-white flex flex-col overflow-hidden">
            <div className="p-6 md:p-10 overflow-y-auto">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Donate to {nonprofit.name}
              </h1>
              
              {nonprofit.ein && (
                <p className="text-white/70 text-sm mb-2">
                  EIN: {nonprofit.ein}
                </p>
              )}
              
              {(nonprofit.city || nonprofit.state) && (
                <p className="text-white/70 text-sm mb-6">
                  {[nonprofit.city, nonprofit.state].filter(Boolean).join(", ")}
                </p>
              )}

              <div className="prose prose-invert max-w-none">
                <p className="text-white/90 mb-6">
                  Your donation will directly support {nonprofit.name}'s mission and programs.
                  Every contribution makes a difference.
                </p>
              </div>

              <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold mb-2">About this donation</h3>
                <p className="text-sm text-white/70">
                  100% of your donation goes directly to {nonprofit.name}. 
                  You can optionally cover transaction fees to ensure the full amount reaches the nonprofit.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Donation Form (Scrollable) */}
          <div className="bg-white/5 backdrop-blur-sm overflow-y-auto">
            <div className="p-6 md:p-10">
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
                {/* Donation Amount */}
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Donation Amount (USD)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50.00"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full"
                    required
                  />
                </div>

                {/* Frequency Selection */}
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Donation Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFrequency("once")}
                      className={`p-4 rounded-full border-2 transition-all font-semibold ${
                        frequency === "once"
                          ? "bg-white text-black border-white shadow-lg scale-105"
                          : "bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/30"
                      }`}
                    >
                      One-Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequency("monthly")}
                      className={`p-4 rounded-full border-2 transition-all font-semibold ${
                        frequency === "monthly"
                          ? "bg-white text-black border-white shadow-lg scale-105"
                          : "bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/30"
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                {/* Cover Transaction Costs */}
                <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
                  <input
                    type="checkbox"
                    id="coverCosts"
                    checked={coverTransactionCosts}
                    onChange={(e) => setCoverTransactionCosts(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="coverCosts" className="text-sm text-white/90 cursor-pointer">
                    Cover transaction costs so 100% of my donation goes to the nonprofit
                    {amount && !isNaN(parseFloat(amount)) && coverTransactionCosts && (
                      <span className="block mt-1 text-white/70">
                        (Total: ${calculateWithTransactionFees(parseFloat(amount)).toFixed(2)})
                      </span>
                    )}
                  </label>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full"
                    required
                  />
                </div>

                {/* Donor Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/80 text-sm mb-1">First Name</label>
                      <Input
                        type="text"
                        value={donorFirstName}
                        onChange={(e) => setDonorFirstName(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Last Name</label>
                      <Input
                        type="text"
                        value={donorLastName}
                        onChange={(e) => setDonorLastName(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-1">Phone (Optional)</label>
                    <Input
                      type="tel"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-white text-black hover:bg-white/90 font-bold py-6 text-lg rounded-full"
                >
                  {processing ? "Processing..." : `Donate $${amount || "0.00"}`}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
