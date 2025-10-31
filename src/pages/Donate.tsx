import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoBackground from "@/components/VideoBackground";
import DonationBarometer from "@/components/DonationBarometer";
import { toast } from "sonner";

type RecentDonation = {
  id: string;
  customer_email: string;
  amount_cents: number;
  created_at: string;
};

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
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
  const [showMonthlyUpsell, setShowMonthlyUpsell] = useState(false);
  const [showDonorDetails, setShowDonorDetails] = useState(false);
  const [donorFirstName, setDonorFirstName] = useState("");
  const [donorLastName, setDonorLastName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");

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

        // Fetch recent donations for this cause
        const { data: donations, error: donationsError } = await supabase
          .from("donations")
          .select("id,customer_email,amount_cents,created_at")
          .eq("cause_id", causeId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!donationsError && donations && alive) {
          setRecentDonations(donations);
        }
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

    // Show monthly upsell for one-time donations
    if (frequency === "once") {
      setShowMonthlyUpsell(true);
      return;
    }

    // Process donation directly for monthly
    await processDonation();
  };

  const processDonation = async () => {
    if (!cause) return;
    
    const donationAmount = parseFloat(amount);
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
    <div className="fixed inset-0 w-screen h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-4 md:px-6 py-4 flex items-center justify-center text-white backdrop-blur-md bg-black/30 border-b border-white/10 shrink-0">
        <div className="text-sm md:text-base font-semibold uppercase tracking-[0.2em]">
          DONATIONS
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        <VideoBackground
          srcMp4="/media/hero.mp4"
          srcWebm="/media/hero.webm"
          poster="/media/hero-poster.jpg"
          overlay={<div className="absolute inset-0 bg-black/60" />}
        />

        <div className="relative w-full h-full grid lg:grid-cols-2">
          {/* Left Column - Cause Info (Scrollable) */}
          <div className="bg-white/10 backdrop-blur-md border-r border-white/20 text-white flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                  {cause.name}
                </h1>
                
                {cause.summary && (
                  <p className="text-white/90 mb-6 leading-relaxed">
                    {cause.summary}
                  </p>
                )}

                {/* Barometer */}
                <div className="bg-white/5 rounded-xl p-4 mb-6">
                  <DonationBarometer
                    raised_cents={cause.raised_cents || 0}
                    goal_cents={cause.goal_cents || 1}
                  />
                </div>

                <div className="text-sm text-white/70 space-y-2 mb-8">
                  <p>Your donation helps make a direct impact on this cause.</p>
                  <p>100% of your contribution goes directly to supporting this initiative.</p>
                </div>
              </div>

              {/* Recent Donations */}
              <div>
                <h2 className="text-xl font-bold mb-4 text-white">Recent Donations</h2>
                <div className="space-y-3">
                  {recentDonations.length > 0 ? (
                    recentDonations.map((donation) => {
                      const donorName = donation.customer_email.split('@')[0];
                      const displayName = donorName.charAt(0).toUpperCase() + donorName.slice(1);
                      const amount = (donation.amount_cents / 100).toLocaleString('en-US', { 
                        style: 'currency', 
                        currency: 'USD',
                        minimumFractionDigits: 0
                      });
                      
                      return (
                        <div 
                          key={donation.id}
                          className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
                              {displayName.charAt(0)}
                            </div>
                            <span className="text-white/90 font-medium">{displayName}</span>
                          </div>
                          <span className="text-white font-semibold">{amount}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-white/60 text-sm">No donations yet. Be the first!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Donation Form, Monthly Upsell, or Donor Details */}
          <div className="bg-white/10 backdrop-blur-md text-white flex flex-col p-6 md:p-8">
            {showDonorDetails ? (
              <div className="space-y-6">
                <button
                  onClick={() => {
                    setShowDonorDetails(false);
                    setShowMonthlyUpsell(true);
                  }}
                  className="flex items-center gap-2 text-sm hover:underline text-white/90"
                >
                  ← Back
                </button>

                <h2 className="text-2xl font-bold text-white">Enter your details</h2>

                <form onSubmit={(e) => { e.preventDefault(); processDonation(); }} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      value={donorFirstName}
                      onChange={(e) => setDonorFirstName(e.target.value)}
                      placeholder="First name"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                    />
                  </div>

                  <div>
                    <Input
                      type="text"
                      value={donorLastName}
                      onChange={(e) => setDonorLastName(e.target.value)}
                      placeholder="Last name"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                    />
                  </div>

                  <div>
                    <Input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                    />
                  </div>

                  <div>
                    <Input
                      type="tel"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      placeholder="Phone number (optional)"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-6 text-lg rounded-lg transition-all"
                  >
                    {processing ? "Processing..." : "Continue"}
                  </Button>

                  <div className="border-t border-white/10 pt-4 space-y-2 text-sm text-white/70">
                    <a href="#" className="block underline hover:no-underline">
                      Is my donation secure?
                    </a>
                    <a href="#" className="block underline hover:no-underline">
                      Is this donation tax-deductible?
                    </a>
                    <a href="#" className="block underline hover:no-underline">
                      Can I cancel my recurring donation?
                    </a>
                  </div>
                </form>
              </div>
            ) : showMonthlyUpsell ? (
              <div className="space-y-6">
                <button
                  onClick={() => setShowMonthlyUpsell(false)}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  ← Back
                </button>

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Become a monthly supporter</h2>
                  <p className="text-white/80 leading-relaxed">
                    Will you convert your ${amount} contribution into a monthly donation? Your ongoing support can help us focus better on our work.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setFrequency("monthly");
                      setShowDonorDetails(true);
                      setShowMonthlyUpsell(false);
                    }}
                    disabled={processing}
                    className="w-full h-14 text-lg bg-red-500 hover:bg-red-600 text-white"
                  >
                    ❤️ Donate ${Math.max(10, Math.floor(parseFloat(amount) / 2))}/month
                  </Button>
                  <Button
                    onClick={() => {
                      setFrequency("monthly");
                      setShowDonorDetails(true);
                      setShowMonthlyUpsell(false);
                    }}
                    disabled={processing}
                    className="w-full h-14 text-lg bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Donate ${Math.max(5, Math.floor(parseFloat(amount) / 3))}/month
                  </Button>
                  <button
                    onClick={processDonation}
                    disabled={processing}
                    className="w-full text-center underline py-2 hover:no-underline text-white/90"
                  >
                    No, keep my one-time ${amount} gift
                  </button>
                </div>

                <div className="border-t border-white/10 pt-6 space-y-2 text-sm text-white/70">
                  <a href="#" className="block underline hover:no-underline">
                    Is my donation secure?
                  </a>
                  <a href="#" className="block underline hover:no-underline">
                    Is this donation tax-deductible?
                  </a>
                  <a href="#" className="block underline hover:no-underline">
                    Can I cancel my recurring donation?
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold">Secure Donation</h2>
                </div>

                <form onSubmit={handleDonate} className="space-y-6">
              {/* Frequency Toggle */}
              <div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setFrequency("once")}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      frequency === "once"
                        ? "bg-white text-black"
                        : "bg-white/10 text-white border border-white/20 hover:bg-white/15"
                    }`}
                  >
                    Give once
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency("monthly")}
                    className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      frequency === "monthly"
                        ? "bg-white text-black"
                        : "bg-white/10 text-white border border-white/20 hover:bg-white/15"
                    }`}
                  >
                    <span className="text-red-500">♥</span> Monthly
                  </button>
                </div>
              </div>

              {/* Preset Amounts */}
              <div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[140, 70, 40].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        amount === amt.toString()
                          ? "bg-white/20 text-white border-2 border-white"
                          : "bg-white/10 text-white border border-white/20 hover:bg-white/15"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[25, 15, 8].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        amount === amt.toString()
                          ? "bg-white/20 text-white border-2 border-white"
                          : "bg-white/10 text-white border border-white/20 hover:bg-white/15"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-2 text-white/90">
                  Or enter custom amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 text-lg">
                    $
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="15"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 pl-8 pr-16 h-12 text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-sm">
                    USD
                  </span>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-white/90">
                  Your Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  placeholder="donor@example.com"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={processing}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-lg rounded-lg transition-all"
              >
                {processing ? "Processing..." : "Donate"}
              </Button>

                  <p className="text-xs text-center text-white/50">
                    Secure payment • Tax-deductible • Cancel anytime
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
