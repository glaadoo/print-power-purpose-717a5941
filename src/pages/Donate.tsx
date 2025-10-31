import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoBackground from "@/components/VideoBackground";
import DonationBarometer from "@/components/DonationBarometer";
import { toast } from "sonner";

type Cause = {
  id: string;
  name: string;
  summary?: string | null;
  goal_cents?: number | null;
  raised_cents?: number | null;
};

export default function Donate() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const causeId = searchParams.get("cause");

  const [cause, setCause] = useState<Cause | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    document.title = "Donate - Print Power Purpose";
  }, []);

  useEffect(() => {
    if (!causeId) {
      nav("/causes");
      return;
    }

    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("causes")
          .select("id,name,summary,goal_cents,raised_cents")
          .eq("id", causeId)
          .single();

        if (error) throw error;
        if (alive && data) setCause(data);
      } catch (e: any) {
        console.error("Failed to load cause:", e);
        toast.error("Failed to load cause");
        nav("/causes");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [causeId, nav]);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cause) return;
    
    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount <= 0) {
      toast.error("Please enter a valid donation amount");
      return;
    }

    if (!donorEmail || !donorEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setProcessing(true);

    try {
      // Create Stripe checkout session for donation
      const { data, error } = await supabase.functions.invoke("checkout-session", {
        body: {
          causeId: cause.id,
          causeName: cause.name,
          donationCents: Math.round(donationAmount * 100),
          customerEmail: donorEmail,
          isDonationOnly: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Donation error:", err);
      toast.error(err.message || "Failed to process donation");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center text-white">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />
        <p className="relative text-lg">Loading...</p>
      </div>
    );
  }

  if (!cause) {
    return null;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden text-white">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <button
          onClick={() => nav("/causes")}
          className="text-sm md:text-base font-semibold uppercase tracking-wide hover:opacity-80"
        >
          ← Back to Causes
        </button>
        <div className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          DONATE
        </div>
      </header>

      {/* Main content */}
      <div className="h-full w-full pt-16 overflow-y-auto">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/50" />}
        />

        <div className="relative w-full min-h-full flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-2xl">
            {/* Cause info card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-6 md:p-8 mb-6">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{cause.name}</h1>
              {cause.summary && (
                <p className="text-white/80 mb-6">{cause.summary}</p>
              )}
              
              {/* Barometer */}
              <div className="max-w-md mx-auto">
                <DonationBarometer
                  raised_cents={cause.raised_cents || 0}
                  goal_cents={cause.goal_cents || 1}
                />
              </div>
            </div>

            {/* Donation form card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-6 md:p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Make a Donation</h2>
              
              <form onSubmit={handleDonate} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Your Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="donor@example.com"
                    required
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                  />
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium mb-2">
                    Donation Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                      $
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="25.00"
                      required
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50 pl-8"
                    />
                  </div>
                  
                  {/* Quick amount buttons */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[10, 25, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 text-sm font-medium transition-colors"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-white text-black hover:bg-white/90 font-semibold py-6 text-lg"
                >
                  {processing ? "Processing..." : "Continue to Payment"}
                </Button>
              </form>

              <p className="text-xs text-center text-white/60 mt-4">
                You'll be redirected to a secure payment page to complete your donation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
