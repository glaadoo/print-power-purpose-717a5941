import { useState, useEffect } from "react";
import { Trophy, Sparkles, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Progress } from "@/components/ui/progress";
import { useCause } from "@/context/CauseContext";
import { useCart } from "@/context/CartContext";

const MILESTONE_GOAL_CENTS = 77700; // $777

export default function CompactMilestoneBar() {
  const { nonprofit } = useCause();
  const { totalCents } = useCart();
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasTriggeredCelebration, setHasTriggeredCelebration] = useState(false);

  if (!nonprofit) return null;

  const currentProgressCents = nonprofit.current_progress_cents || 0;
  const milestoneCount = nonprofit.milestone_count || 0;
  
  // Calculate total progress including current cart
  const totalProgressCents = currentProgressCents + totalCents;
  const progressPercent = Math.min((totalProgressCents / MILESTONE_GOAL_CENTS) * 100, 100);
  const isGoalReached = totalProgressCents >= MILESTONE_GOAL_CENTS;
  
  const currentProgressUsd = (totalProgressCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });
  
  const remainingCents = Math.max(MILESTONE_GOAL_CENTS - totalProgressCents, 0);
  const remainingUsd = (remainingCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });

  // Trigger celebration when milestone is reached
  useEffect(() => {
    if (isGoalReached && !hasTriggeredCelebration) {
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
  }, [isGoalReached, hasTriggeredCelebration]);

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
            isGoalReached 
              ? "bg-yellow-100 text-yellow-600" 
              : "bg-emerald-100 text-emerald-600"
          }`}>
            <Trophy className="h-5 w-5" />
          </div>
        </div>

        {/* Progress Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {nonprofit.name}
            </p>
            <div className="flex items-center gap-2">
              {milestoneCount > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {milestoneCount} milestone{milestoneCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="text-sm font-bold text-primary">{progressPercent.toFixed(0)}%</span>
            </div>
          </div>
          
          <Progress 
            value={progressPercent} 
            className={`h-2 ${isGoalReached ? '[&>div]:bg-yellow-500' : ''}`}
          />
          
          <div className="flex justify-between text-xs mt-1">
            <span className="text-muted-foreground">{currentProgressUsd} / $777</span>
            {!isGoalReached && (
              <span className="text-emerald-600 font-medium">{remainingUsd} to milestone!</span>
            )}
            {isGoalReached && (
              <span className="text-yellow-600 font-medium">🎉 Goal reached!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}