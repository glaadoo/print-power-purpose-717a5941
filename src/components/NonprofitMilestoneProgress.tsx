import { useState, useEffect } from "react";
import { Target, PartyPopper, Sparkles, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Progress } from "@/components/ui/progress";

interface NonprofitMilestoneProgressProps {
  nonprofitName: string;
  nonprofitId: string;
  milestoneCount: number;
  currentProgressCents: number;
  className?: string;
}

const MILESTONE_GOAL_CENTS = 77700; // $777

export default function NonprofitMilestoneProgress({
  nonprofitName,
  nonprofitId,
  milestoneCount,
  currentProgressCents,
  className = "",
}: NonprofitMilestoneProgressProps) {
  const [hasTriggeredCelebration, setHasTriggeredCelebration] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const hasMilestones = milestoneCount > 0;
  const goalUsd = (MILESTONE_GOAL_CENTS / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });

  // Calculate progress percentage
  const progressPercent = Math.min((currentProgressCents / MILESTONE_GOAL_CENTS) * 100, 100);
  const currentProgressUsd = (currentProgressCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
  const remainingCents = Math.max(MILESTONE_GOAL_CENTS - currentProgressCents, 0);
  const remainingUsd = (remainingCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  // Trigger celebration when milestone count increases
  useEffect(() => {
    const celebrationKey = `nonprofit_milestone_celebrated_${nonprofitId}_${milestoneCount}`;
    const alreadyCelebrated = localStorage.getItem(celebrationKey);

    if (hasMilestones && !alreadyCelebrated && !hasTriggeredCelebration) {
      setHasTriggeredCelebration(true);
      setShowCelebration(true);
      localStorage.setItem(celebrationKey, "true");

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
    } else if (hasMilestones && alreadyCelebrated) {
      setShowCelebration(true);
    }
  }, [hasMilestones, nonprofitId, milestoneCount, hasTriggeredCelebration]);

  return (
    <div
      className={`rounded-xl p-6 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Nonprofit Milestone Progress</h3>
      </div>

      {/* Nonprofit Name */}
      <p className="text-sm text-gray-600 mb-4 font-medium">{nonprofitName}</p>

      {/* Progress toward next milestone */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress to next {goalUsd} milestone</span>
          <span className="font-medium text-primary">{progressPercent.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
        <div className="flex justify-between text-xs mt-2 text-muted-foreground">
          <span>{currentProgressUsd} raised</span>
          <span>{remainingUsd} to go</span>
        </div>
      </div>

      {/* Milestone Count Display */}
      <div className="mb-4 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{goalUsd} Milestones Achieved</p>
            <p className="text-4xl font-bold text-primary">{milestoneCount}</p>
          </div>
        </div>
      </div>

      {/* Milestone Reached Celebration */}
      <AnimatePresence>
        {showCelebration && hasMilestones && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative overflow-hidden"
          >
            {/* Confetti particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${
                    i % 4 === 0
                      ? "bg-yellow-400"
                      : i % 4 === 1
                      ? "bg-pink-400"
                      : i % 4 === 2
                      ? "bg-emerald-400"
                      : "bg-purple-400"
                  }`}
                  initial={{ x: "50%", y: "50%", scale: 0, opacity: 1 }}
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
                    repeatDelay: 3,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-100 via-yellow-50 to-emerald-100 border border-emerald-300">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
              >
                <PartyPopper className="h-8 w-8 text-emerald-600" />
              </motion.div>

              <div className="flex-1">
                <motion.p
                  className="font-bold text-emerald-700 text-lg"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🎉 Milestone Achieved!
                </motion.p>
                <p className="text-sm text-emerald-600 mt-1">
                  {nonprofitName} has achieved {milestoneCount} {goalUsd} milestone{milestoneCount > 1 ? 's' : ''}!
                </p>
              </div>

              <motion.div
                animate={{ rotate: 360, scale: [1, 1.3, 1] }}
                transition={{
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity },
                }}
              >
                <Sparkles className="h-6 w-6 text-yellow-500" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No milestone message */}
      {!hasMilestones && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <p className="text-sm text-emerald-700">
            <span className="font-medium">Help {nonprofitName} reach their first {goalUsd} milestone!</span>
          </p>
        </div>
      )}
    </div>
  );
}
