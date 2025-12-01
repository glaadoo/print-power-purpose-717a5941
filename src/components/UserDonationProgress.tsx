import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Target, Sparkles, PartyPopper, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MilestoneAchievementBadge from "./MilestoneAchievementBadge";
import {
  MILESTONE_TIERS,
  getAchievedTiers,
  getProgressToNextTier,
  formatCents,
  MilestoneTier,
} from "@/lib/milestone-tiers";

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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.email) {
          console.log('[UserDonationProgress] No session or email found');
          setLoading(false);
          return;
        }

        const userEmail = session.user.email;
        setUserEmail(userEmail);
        console.log('[UserDonationProgress] Fetching donations for:', userEmail);

        // Fetch donations from donations table
        const { data: donations, error } = await supabase
          .from("donations")
          .select("amount_cents")
          .eq("customer_email", userEmail);

        if (error) {
          console.error('[UserDonationProgress] Error fetching donations:', error);
          throw error;
        }

        console.log('[UserDonationProgress] Donations fetched:', donations);
        const total = donations?.reduce((sum, d) => sum + (d.amount_cents || 0), 0) || 0;
        console.log('[UserDonationProgress] Total donated cents:', total);
        setTotalDonatedCents(total);
      } catch (error) {
        console.error("[UserDonationProgress] Error fetching user donations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserDonations();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserDonations();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || !userEmail) {
    return null;
  }

  const achievedTiers = getAchievedTiers(totalDonatedCents);
  const { nextTier, percentage, remainingCents } = getProgressToNextTier(totalDonatedCents);
  const totalDonatedUsd = formatCents(totalDonatedCents);
  const isLight = variant === "light";
  const allTiersCompleted = achievedTiers.length === MILESTONE_TIERS.length;

  return (
    <div className={`rounded-xl p-6 ${isLight ? "bg-gradient-to-br from-blue-50 to-white border border-blue-100" : "bg-white/10 border border-white/20"} ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className={`h-5 w-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
        <h3 className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
          Your Giving Journey
        </h3>
      </div>

      {/* Total Donated */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className={`text-3xl font-bold ${isLight ? "text-blue-600" : "text-white"}`}>
            {totalDonatedUsd}
          </span>
          <span className={`text-sm ${isLight ? "text-gray-600" : "text-white/70"}`}>
            total donated
          </span>
        </div>
      </div>

      {/* Achieved Badges */}
      {achievedTiers.length > 0 && (
        <div className="mb-4">
          <p className={`text-xs font-medium mb-2 ${isLight ? "text-gray-500" : "text-white/60"}`}>
            Milestones Achieved
          </p>
          <div className="flex flex-wrap gap-2">
            {achievedTiers.map((tier) => (
              <MilestoneAchievementBadge
                key={tier.id}
                tier={tier}
                totalDonated={totalDonatedUsd}
              />
            ))}
          </div>
        </div>
      )}

      {/* Progress to Next Tier */}
      {nextTier && (
        <div className={`p-3 rounded-lg ${isLight ? "bg-gray-50" : "bg-white/5"} mb-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{nextTier.icon}</span>
              <span className={`text-sm font-medium ${isLight ? "text-gray-700" : "text-white/90"}`}>
                Next: {nextTier.name}
              </span>
            </div>
            <span className={`text-xs ${isLight ? "text-gray-500" : "text-white/60"}`}>
              {formatCents(remainingCents)} to go
            </span>
          </div>
          <Progress 
            value={percentage} 
            className={`h-2 ${isLight ? "bg-gray-200" : "bg-white/20"}`}
          />
          <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-white/60"}`}>
            {percentage}% to {formatCents(nextTier.amountCents)}
          </p>
        </div>
      )}

      {/* All Tiers Completed Celebration */}
      <AnimatePresence>
        {allTiersCompleted && (
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
                  initial={{ x: "50%", y: "50%", scale: 0, opacity: 1 }}
                  animate={{ 
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                    scale: [0, 1, 0.5],
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: 2, delay: i * 0.1, repeat: Infinity, repeatDelay: 3 }}
                />
              ))}
            </div>
            
            <div className={`flex items-center gap-3 p-4 rounded-xl ${
              isLight 
                ? "bg-gradient-to-r from-purple-50 via-pink-50 to-cyan-50 border border-purple-200" 
                : "bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 border border-purple-500/30"
            }`}>
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
              >
                <PartyPopper className={`h-6 w-6 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
              </motion.div>
              
              <div className="flex-1">
                <motion.p 
                  className={`font-semibold ${isLight ? "text-purple-700" : "text-purple-300"}`}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  👑 Legendary! All milestones completed!
                </motion.p>
                <p className={`text-xs mt-1 ${isLight ? "text-purple-600" : "text-purple-400/80"}`}>
                  You are a true giving champion!
                </p>
              </div>
              
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity }
                }}
              >
                <Sparkles className={`h-5 w-5 ${isLight ? "text-yellow-500" : "text-yellow-400"}`} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone Tiers Preview */}
      <div className="mt-4 pt-4 border-t border-gray-200/50">
        <p className={`text-xs font-medium mb-3 ${isLight ? "text-gray-500" : "text-white/60"}`}>
          All Milestone Tiers
        </p>
        <div className="grid grid-cols-5 gap-1">
          {MILESTONE_TIERS.map((tier) => {
            const isAchieved = totalDonatedCents >= tier.amountCents;
            return (
              <div
                key={tier.id}
                className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                  isAchieved 
                    ? `${tier.colors.bg} ${tier.colors.border} border` 
                    : isLight ? "bg-gray-100 opacity-50" : "bg-white/5 opacity-50"
                }`}
              >
                <span className={`text-xl ${!isAchieved && "grayscale"}`}>{tier.icon}</span>
                <span className={`text-[10px] font-medium mt-1 ${
                  isAchieved ? tier.colors.text : isLight ? "text-gray-400" : "text-white/40"
                }`}>
                  {formatCents(tier.amountCents)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
