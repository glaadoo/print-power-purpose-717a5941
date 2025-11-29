import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp } from "lucide-react";

const MILESTONE_CENTS = 77700; // $777

interface UserDonationProgressProps {
  variant?: "light" | "dark";
  className?: string;
}

export default function UserDonationProgress({ 
  variant = "light",
  className = "" 
}: UserDonationProgressProps) {
  const [totalDonatedCents, setTotalDonatedCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserDonations() {
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.email) {
          setLoading(false);
          return;
        }

        setUserEmail(session.user.email);

        // Fetch all donations for this user
        const { data: donations, error } = await supabase
          .from("donations")
          .select("amount_cents")
          .eq("customer_email", session.user.email);

        if (error) throw error;

        const total = donations?.reduce((sum, d) => sum + (d.amount_cents || 0), 0) || 0;
        setTotalDonatedCents(total);
      } catch (error) {
        console.error("Error fetching user donations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserDonations();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserDonations();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Don't render if not authenticated or still loading
  if (loading || !userEmail) {
    return null;
  }

  const percentage = Math.min(100, Math.round((totalDonatedCents / MILESTONE_CENTS) * 100));
  const totalDonatedUsd = (totalDonatedCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const milestoneUsd = (MILESTONE_CENTS / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const remainingCents = Math.max(0, MILESTONE_CENTS - totalDonatedCents);
  const remainingUsd = (remainingCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const isLight = variant === "light";

  return (
    <div className={`rounded-xl p-6 ${isLight ? "bg-gradient-to-br from-blue-50 to-white border border-blue-100" : "bg-white/10 border border-white/20"} ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Target className={`h-5 w-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
        <h3 className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
          Your Donation Milestone
        </h3>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className={`text-3xl font-bold ${isLight ? "text-blue-600" : "text-white"}`}>
            {totalDonatedUsd}
          </span>
          <span className={`text-sm ${isLight ? "text-gray-600" : "text-white/70"}`}>
            of {milestoneUsd} goal
          </span>
        </div>
        
        <Progress 
          value={percentage} 
          className={`h-3 ${isLight ? "bg-blue-100" : "bg-white/20"}`}
        />
        
        <div className="flex justify-between items-center mt-2">
          <span className={`text-sm font-medium ${isLight ? "text-blue-600" : "text-blue-400"}`}>
            {percentage}% complete
          </span>
          {percentage < 100 && (
            <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/60"}`}>
              {remainingUsd} to go
            </span>
          )}
        </div>
      </div>

      {percentage >= 100 ? (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${isLight ? "bg-green-50 text-green-700" : "bg-green-500/20 text-green-300"}`}>
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">
            Congratulations! You've reached your $777 milestone!
          </span>
        </div>
      ) : (
        <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/70"}`}>
          Keep donating to reach your ${milestoneUsd} milestone and unlock special recognition!
        </p>
      )}
    </div>
  );
}
