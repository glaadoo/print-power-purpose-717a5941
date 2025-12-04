import { useState, useEffect } from "react";
import { Trophy, Sparkles, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Progress } from "@/components/ui/progress";
import { useCause } from "@/context/CauseContext";
import { useCart } from "@/context/CartContext";

const MILESTONE_GOAL_CENTS = 77700; // $777
const DONATION_RATIO = 77700 / 115400; // $777 donation from $1154 gross (~67.3%)

export default function CompactMilestoneBar() {
  const { nonprofit } = useCause();
  const { totalCents } = useCart();
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasTriggeredCelebration, setHasTriggeredCelebration] = useState(false);

  if (!nonprofit) return null;

  const currentProgressCents = nonprofit.current_progress_cents || 0;
  const milestoneCount = nonprofit.milestone_count || 0;
  
  // Calculate progress toward CURRENT milestone only (resets after each $777)
  const progressTowardCurrentMilestone = currentProgressCents % MILESTONE_GOAL_CENTS;
  
  // Cart total contributes as donation (67.3% of cart goes to nonprofit)
  const cartDonationCents = Math.round(totalCents * DONATION_RATIO);
  const progressWithCart = progressTowardCurrentMilestone + cartDonationCents;
  const progressPercent = Math.min((progressWithCart / MILESTONE_GOAL_CENTS) * 100, 100);
  
  // IMPORTANT: Milestone is only "reached" based on ACTUAL paid progress, not cart projections
  const isActualGoalReached = progressTowardCurrentMilestone >= MILESTONE_GOAL_CENTS;
  // Show projected completion only for display purposes (progress bar can fill)
  const wouldReachGoalWithCart = progressWithCart >= MILESTONE_GOAL_CENTS;
  const hasCartItems = totalCents > 0;
  
  // Display only progress toward current milestone, capped at goal
  const displayProgressCents = Math.min(progressWithCart, MILESTONE_GOAL_CENTS);
  const displayProgressUsd = (displayProgressCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });
  
  const remainingCents = Math.max(MILESTONE_GOAL_CENTS - progressWithCart, 0);
  const remainingUsd = (remainingCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });

  // Only trigger celebration for ACTUAL paid milestones, not projections
  useEffect(() => {
    if (isActualGoalReached && !hasTriggeredCelebration) {
      setHasTriggeredCelebration(true);
      setShowCelebration(true);

      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#9B59B6"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#9B59B6"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Hide celebration after animation
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, [isActualGoalReached, hasTriggeredCelebration]);

  return (
    <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 shadow-sm">
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            className="mb-4 p-4 rounded-xl bg-gradient-to-r from-yellow-100 via-emerald-100 to-yellow-100 border border-yellow-300"
          >
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
              >
                <PartyPopper className="h-8 w-8 text-emerald-600" />
              </motion.div>
              <div className="text-center">
                <motion.p
                  className="font-bold text-emerald-700 text-lg"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🎉 Milestone Reached!
                </motion.p>
                <p className="text-sm text-emerald-600">
                  You've helped {nonprofit.name} reach a $777 milestone!
                </p>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-6 w-6 text-yellow-500" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4">
        {/* Trophy Icon */}
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isActualGoalReached 
              ? "bg-yellow-100 text-yellow-600" 
              : "bg-emerald-100 text-emerald-600"
          }`}>
            <Trophy className="h-5 w-5" />
          </div>
        </div>

        {/* Progress Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {nonprofit.name}
              </p>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                Milestone #{milestoneCount + 1}
              </span>
            </div>
            <span className="text-sm font-bold text-primary ml-2">{progressPercent.toFixed(0)}%</span>
          </div>
          
          <Progress 
            value={progressPercent} 
            className={`h-2 ${isActualGoalReached ? '[&>div]:bg-yellow-500' : ''}`}
          />
          
          <div className="flex flex-col text-xs mt-1 gap-1">
            {!isActualGoalReached ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{displayProgressUsd} / $777</span>
                  <span className="text-emerald-600 font-medium">{remainingUsd} to go!</span>
                </div>
                {hasCartItems && wouldReachGoalWithCart && (
                  <p className="text-amber-600 text-center font-medium">
                    🎯 Your purchase will complete this milestone!
                  </p>
                )}
                {hasCartItems && !wouldReachGoalWithCart && (
                  <p className="text-emerald-600 text-center font-medium">
                    Complete your purchase to help this nonprofit reach its $777 milestone.
                  </p>
                )}
              </>
            ) : (
              <span className="text-yellow-600 font-medium text-center w-full">🎉 Milestone #{milestoneCount + 1} Complete!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}