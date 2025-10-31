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
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [donorFirstName, setDonorFirstName] = useState("");
  const [donorLastName, setDonorLastName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorStreetAddress, setDonorStreetAddress] = useState("");
  const [donorApartment, setDonorApartment] = useState("");
  const [donorCity, setDonorCity] = useState("");
  const [donorState, setDonorState] = useState("");
  const [donorZipCode, setDonorZipCode] = useState("");
  const [donorCountry, setDonorCountry] = useState("United States");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [coverTransactionCosts, setCoverTransactionCosts] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check for success in URL params
  useEffect(() => {
    const success = searchParams.get("payment");
    if (success === "success") {
      setShowSuccessMessage(true);
      // Remove the query param
      nav(`/donate?cause=${causeId}`, { replace: true });
    }
  }, [searchParams, causeId, nav]);

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
    let finalAmount = donationAmount;
    
    // Add transaction costs if checked (approximately 2.9% + $0.30)
    if (coverTransactionCosts) {
      finalAmount = Math.round((donationAmount + 0.30) / 0.971 * 100) / 100;
    }
    
    setProcessing(true);

    try {
      // Create Stripe checkout session for monthly recurring donation
      const { data, error } = await supabase.functions.invoke("create-monthly-donation", {
        body: {
          causeId: cause.id,
          causeName: cause.name,
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

          {/* Right Column - Donation Form, Monthly Upsell, Donor Details, Address Form, or Payment Form */}
          <div className="bg-white/10 backdrop-blur-md text-white flex flex-col p-6 md:p-8">
            {showPaymentForm ? (
              <div className="space-y-6">
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setShowAddressForm(true);
                  }}
                  className="flex items-center gap-2 text-sm hover:underline text-white/90"
                >
                  ← Back
                </button>

                <h2 className="text-2xl font-bold text-white">
                  You donate ${parseFloat(amount).toFixed(2)} USD/month
                </h2>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={coverTransactionCosts}
                      onChange={(e) => setCoverTransactionCosts(e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-white/90 flex items-center gap-2">
                      Cover transaction costs
                      <button className="text-white/60 hover:text-white/90">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </span>
                  </label>
                </div>

                <div className="space-y-3 border border-white/20 rounded-lg overflow-hidden">
                  <button 
                    onClick={processDonation}
                    disabled={processing}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-3 text-left border-b border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span>Apple Pay</span>
                  </button>

                  <button 
                    onClick={processDonation}
                    disabled={processing}
                    className="w-full p-4 bg-blue-500/20 border-2 border-blue-500 hover:bg-blue-500/30 transition-colors flex items-center gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth={2} />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 10h20" />
                    </svg>
                    <span>Credit card</span>
                  </button>

                  <button 
                    onClick={processDonation}
                    disabled={processing}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-3 text-left border-b border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-6 h-6" fill="#00457C" viewBox="0 0 24 24">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.116c-.317-.033-.65-.05-1.005-.05h-2.134l-1.476 9.36c-.05.316.183.597.5.597h2.146c.365 0 .673-.267.729-.629.661-4.18.976-6.196.976-6.196.119-.757.327-1.557.605-2.404.149-.454.31-.866.484-1.235.145-.306.306-.58.487-.81z"/>
                    </svg>
                    <span>PayPal</span>
                  </button>

                  <button 
                    onClick={processDonation}
                    disabled={processing}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    <span>Bank transfer</span>
                  </button>
                </div>

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
              </div>
            ) : showAddressForm ? (
              <div className="space-y-6">
                <button
                  onClick={() => {
                    setShowAddressForm(false);
                    setShowDonorDetails(true);
                  }}
                  className="flex items-center gap-2 text-sm hover:underline text-white/90"
                >
                  ← Back
                </button>

                <h2 className="text-2xl font-bold text-white">Enter your address</h2>

                <form onSubmit={(e) => { e.preventDefault(); setShowAddressForm(false); setShowPaymentForm(true); }} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      value={donorStreetAddress}
                      onChange={(e) => setDonorStreetAddress(e.target.value)}
                      placeholder="Street address"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                    />
                  </div>

                  <div>
                    <Input
                      type="text"
                      value={donorApartment}
                      onChange={(e) => setDonorApartment(e.target.value)}
                      placeholder="Apartment / suite / floor"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                    />
                  </div>

                  <div>
                    <Input
                      type="text"
                      value={donorCity}
                      onChange={(e) => setDonorCity(e.target.value)}
                      placeholder="City"
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        type="text"
                        value={donorState}
                        onChange={(e) => setDonorState(e.target.value)}
                        placeholder="State"
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                      />
                    </div>
                    <div>
                      <Input
                        type="text"
                        value={donorZipCode}
                        onChange={(e) => setDonorZipCode(e.target.value)}
                        placeholder="Zip code"
                        required
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      type="text"
                      value={donorCountry}
                      onChange={(e) => setDonorCountry(e.target.value)}
                      placeholder="Country"
                      required
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
            ) : showDonorDetails ? (
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

                <form onSubmit={(e) => { e.preventDefault(); setShowDonorDetails(false); setShowAddressForm(true); }} className="space-y-4">
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
                <div className="inline-flex rounded-full overflow-hidden border-2 border-white/20 mb-6">
                  <button
                    type="button"
                    onClick={() => setFrequency("once")}
                    className={`px-8 py-3 font-semibold transition-all ${
                      frequency === "once"
                        ? "bg-white text-black border-2 border-blue-500"
                        : "bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    Give once
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency("monthly")}
                    className={`px-8 py-3 font-semibold transition-all flex items-center justify-center gap-2 ${
                      frequency === "monthly"
                        ? "bg-white text-black border-2 border-blue-500"
                        : "bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    <span className={frequency === "monthly" ? "text-red-500" : ""}>♥</span> Monthly
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

      {/* Success Message Overlay */}
      {showSuccessMessage && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSuccessMessage(false)}
        >
          <div
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full text-center text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-white/80 mb-1">
                Thank you for subscribing to donate every month.
              </p>
              <p className="text-white/60 text-sm">
                Your support makes a real difference.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
