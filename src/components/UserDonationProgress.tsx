import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Target, Sparkles, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MilestoneAchievementBadge from "./MilestoneAchievementBadge";

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

      <AnimatePresence>
        {percentage >= 100 ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden"
          >
            {/* Confetti particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${
                    i % 4 === 0 ? "bg-yellow-400" : 
                    i % 4 === 1 ? "bg-pink-400" : 
                    i % 4 === 2 ? "bg-blue-400" : "bg-green-400"
                  }`}
                  initial={{ 
                    x: "50%", 
                    y: "50%", 
                    scale: 0,
                    opacity: 1 
                  }}
                  animate={{ 
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                    scale: [0, 1, 0.5],
                    opacity: [1, 1, 0],
                  }}
                  transition={{ 
                    duration: 2,
                    delay: i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                />
              ))}
            </div>
            
            <div className={`flex items-center gap-3 p-4 rounded-xl ${
              isLight 
                ? "bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-green-200" 
                : "bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 border border-green-500/30"
            }`}>
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                <PartyPopper className={`h-6 w-6 ${isLight ? "text-green-600" : "text-green-400"}`} />
              </motion.div>
              
              <div className="flex-1">
                <motion.p 
                  className={`font-semibold ${isLight ? "text-green-700" : "text-green-300"}`}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🎉 Congratulations! You've reached your $777 milestone!
                </motion.p>
                <p className={`text-xs mt-1 ${isLight ? "text-green-600" : "text-green-400/80"}`}>
                  Thank you for your incredible generosity!
                </p>
                <MilestoneAchievementBadge totalDonated={totalDonatedUsd} />
              </div>
              
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity }
                }}
              >
                <Sparkles className={`h-5 w-5 ${isLight ? "text-yellow-500" : "text-yellow-400"}`} />
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/70"}`}>
            Keep donating to reach your {milestoneUsd} milestone and unlock special recognition!
          </p>
        )}
      </AnimatePresence>
    </div>
  );
}
