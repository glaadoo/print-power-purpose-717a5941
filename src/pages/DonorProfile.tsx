import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Calendar, 
  Heart, 
  Trophy,
  Sparkles,
  Gift,
  Target,
  Building2,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  MILESTONE_BADGE_TIERS, 
  getAchievedMilestoneBadges, 
  getCurrentMilestoneBadge, 
  getNextMilestoneBadge,
  getProgressToNextMilestoneBadge,
  formatCents,
  MilestoneBadgeTier 
} from "@/lib/milestone-tiers";
import MilestoneAchievementBadge from "@/components/MilestoneAchievementBadge";
import { Progress } from "@/components/ui/progress";
import { 
  markMilestonesAsSeen, 
  getUncelebratedMilestones, 
  markMilestonesAsCelebrated 
} from "@/hooks/useUnseenMilestones";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import confetti from "canvas-confetti";

interface Donation {
  id: string;
  amount_cents: number;
  amount_total_cents: number;
  created_at: string;
  nonprofit_name: string | null;
  nonprofit_ein: string | null;
  is_milestone: boolean;
}

interface SupportedNonprofit {
  nonprofit_id: string | null;
  nonprofit_name: string | null;
  total_donated: number;
  milestones_contributed: number;
  progress_cents: number;
  last_order_date: string | null;
}

export default function DonorProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalDonatedCents, setTotalDonatedCents] = useState(0);
  const [milestonesCompleted, setMilestonesCompleted] = useState(0);
  const [supportedNonprofits, setSupportedNonprofits] = useState<SupportedNonprofit[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationTriggered = useRef(false);

  useEffect(() => {
    async function fetchDonorData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user?.email) {
          console.log('[DonorProfile] No user email, redirecting to auth');
          navigate("/auth");
          return;
        }

        console.log('[DonorProfile] Fetching impact data for:', user.email);
        setUserEmail(user.email);

        // Fetch user name from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserName(`${profile.first_name} ${profile.last_name}`.trim());
        }

        // Fetch all orders for this user (milestones are based on order amount > $1554)
        const { data: orderData, error } = await supabase
          .from("orders")
          .select("id, amount_total_cents, donation_cents, created_at, nonprofit_name, nonprofit_id, status")
          .eq("customer_email", user.email)
          .in("status", ["completed", "paid"])
          .order("created_at", { ascending: false });

        if (error) {
          console.error('[DonorProfile] Error fetching orders:', error);
          throw error;
        }

        console.log('[DonorProfile] Orders fetched:', orderData);
        
        const MILESTONE_PURCHASE_THRESHOLD = 155400; // $1554
        const MILESTONE_TARGET = 77700; // $777
        
        // Convert orders to donation-like format for display
        const donationList: Donation[] = (orderData || []).map(o => ({
          id: o.id,
          amount_cents: o.donation_cents || 0,
          amount_total_cents: o.amount_total_cents || 0,
          created_at: o.created_at,
          nonprofit_name: o.nonprofit_name,
          nonprofit_ein: null,
          is_milestone: (o.amount_total_cents || 0) >= MILESTONE_PURCHASE_THRESHOLD
        }));
        setDonations(donationList);
        
        const totalDonations = donationList.reduce((sum, d) => sum + d.amount_cents, 0);
        setTotalDonatedCents(totalDonations);
        
        // Calculate milestones completed: each order >= $1554 = 1 milestone
        const milestones = (orderData || []).filter(
          order => (order.amount_total_cents || 0) >= MILESTONE_PURCHASE_THRESHOLD
        ).length;
        setMilestonesCompleted(milestones);

        // Aggregate nonprofits supported with progress tracking
        const nonprofitMap = new Map<string, SupportedNonprofit>();
        (orderData || []).forEach(o => {
          if (!o.nonprofit_name) return;
          const key = o.nonprofit_name;
          const existing = nonprofitMap.get(key);
          const orderDonation = o.donation_cents || 0;
          const isMilestoneOrder = (o.amount_total_cents || 0) >= MILESTONE_PURCHASE_THRESHOLD;
          
          if (existing) {
            existing.total_donated += orderDonation;
            // Track progress toward $777 (reset after each milestone)
            existing.progress_cents = (existing.progress_cents + orderDonation) % MILESTONE_TARGET;
            if (isMilestoneOrder) {
              existing.milestones_contributed += 1;
              existing.progress_cents = 0; // Reset progress after milestone
            }
            if (!existing.last_order_date || o.created_at > existing.last_order_date) {
              existing.last_order_date = o.created_at;
            }
          } else {
            nonprofitMap.set(key, {
              nonprofit_id: o.nonprofit_id,
              nonprofit_name: o.nonprofit_name,
              total_donated: orderDonation,
              milestones_contributed: isMilestoneOrder ? 1 : 0,
              progress_cents: isMilestoneOrder ? 0 : orderDonation % MILESTONE_TARGET,
              last_order_date: o.created_at
            });
          }
        });
        setSupportedNonprofits(Array.from(nonprofitMap.values()));

      } catch (error) {
        console.error("[DonorProfile] Error fetching donor data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDonorData();
  }, [navigate]);

  const achievedBadges = getAchievedMilestoneBadges(milestonesCompleted);
  const currentBadge = getCurrentMilestoneBadge(milestonesCompleted);
  const nextBadge = getNextMilestoneBadge(milestonesCompleted);
  const progress = getProgressToNextMilestoneBadge(milestonesCompleted);

  // Check for uncelebrated milestones and trigger confetti
  useEffect(() => {
    if (achievedBadges.length > 0 && !loading && !celebrationTriggered.current) {
      const uncelebrated = getUncelebratedMilestones(achievedBadges.map(t => t.id));
      
      if (uncelebrated.length > 0) {
        celebrationTriggered.current = true;
        setShowCelebration(true);
        
        // Fire confetti burst
        const duration = 3000;
        const end = Date.now() + duration;
        
        const colors = ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'];
        
        (function frame() {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: colors
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: colors
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        }());
        
        // Mark as celebrated after animation
        setTimeout(() => {
          markMilestonesAsCelebrated(uncelebrated);
          setShowCelebration(false);
        }, duration);
      }
      
      // Always mark as seen
      markMilestonesAsSeen(achievedBadges.map(t => t.id));
    }
  }, [achievedBadges, loading]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Layout centered={false} title="My Impact">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout centered={false} title="My Impact">
      {/* Celebration Overlay */}
      {showCelebration && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white px-8 py-6 rounded-2xl shadow-2xl text-center">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-200" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Congratulations! 🎉</h2>
            <p className="text-lg opacity-90">You've earned new milestone badges!</p>
          </div>
        </motion.div>
      )}

      <div className="max-w-4xl mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {userName ? `${userName}'s Impact` : "My Impact"}
            </h1>
            <p className="text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        {/* Stats Overview - Milestones Focused */}
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/20 rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-muted-foreground">Verified Milestone Impact</p>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p>A milestone is achieved only when a nonprofit reaches $777 AND your payment is completed.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {milestonesCompleted}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-full">
                    <Trophy className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Badge</p>
                    <p className="text-xl font-bold text-foreground">
                      {currentBadge?.name || "Getting Started"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 rounded-full">
                    <Heart className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-muted-foreground">Nonprofits You've Helped</p>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p>Total number of unique nonprofits you've supported through your purchases.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {supportedNonprofits.filter(n => n.nonprofit_name).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TooltipProvider>

        {/* Badge Journey Pathway */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Your Milestone Journey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Progress Summary */}
            {nextBadge && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {milestonesCompleted} milestone{milestonesCompleted !== 1 ? 's' : ''} completed
                  </span>
                  <span className="text-primary font-medium">
                    Next: {nextBadge.name} ({nextBadge.milestonesRequired} milestones)
                  </span>
                </div>
                <Progress value={progress.percentage} className="h-3" />
                <p className="text-center text-sm text-muted-foreground">
                  {progress.remaining} more milestone{progress.remaining !== 1 ? 's' : ''} to reach {nextBadge.name}
                </p>
              </div>
            )}
            
            {/* Visual Badge Pathway */}
            <div className="relative">
              {/* Connection Line */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-muted rounded-full" />
              <div 
                className="absolute top-8 left-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (milestonesCompleted / 20) * 100)}%` 
                }}
              />
              
              {/* Badge Nodes */}
              <div className="relative flex justify-between">
                {MILESTONE_BADGE_TIERS.map((tier, index) => {
                  const isAchieved = milestonesCompleted >= tier.milestonesRequired;
                  const isNext = nextBadge?.id === tier.id;
                  const isFuture = !isAchieved && !isNext;
                  
                  return (
                    <div key={tier.id} className="flex flex-col items-center">
                      {/* Badge Circle */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
                          isAchieved 
                            ? `${tier.colors.bg} ${tier.colors.border} border-2 shadow-lg` 
                            : isNext 
                              ? 'bg-primary/10 border-2 border-primary/50 ring-2 ring-primary/20 ring-offset-2' 
                              : 'bg-muted border-2 border-dashed border-muted-foreground/20'
                        }`}
                      >
                        {isAchieved ? (
                          <span>{tier.icon}</span>
                        ) : isFuture ? (
                          <Lock className="h-5 w-5 text-muted-foreground/40" />
                        ) : (
                          <span className="opacity-50">{tier.icon}</span>
                        )}
                        
                        {/* Achieved checkmark */}
                        {isAchieved && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </motion.div>
                      
                      {/* Badge Label */}
                      <div className="mt-2 text-center">
                        <p className={`text-xs font-medium ${
                          isAchieved 
                            ? tier.colors.text 
                            : isNext 
                              ? 'text-primary' 
                              : 'text-muted-foreground'
                        }`}>
                          {tier.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {tier.milestonesRequired} milestone{tier.milestonesRequired !== 1 ? 's' : ''}
                        </p>
                        
                        {/* Progress for next badge */}
                        {isNext && (
                          <p className="text-[10px] text-primary font-medium mt-1">
                            {milestonesCompleted}/{tier.milestonesRequired}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* $777 Milestone Story Feature */}
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-foreground mb-2">
            Every $777 milestone sparks a new story. ✨
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            When an organization hits a $777 milestone, they unlock a <span className="font-bold text-primary">7-day window to film their impact</span>. 
            Your contributions make this possible — helping nonprofits share their stories with the world!
          </p>
        </div>

        {/* Your Impact Journey - Per Nonprofit Progress */}
        {supportedNonprofits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Your Impact Journey
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supportedNonprofits.filter(n => n.nonprofit_name).map((np, index) => {
                  const MILESTONE_TARGET = 77700;
                  const progressPercent = Math.round((np.progress_cents / MILESTONE_TARGET) * 100);
                  const hasMilestones = np.milestones_contributed > 0;
                  
                  return (
                    <motion.div
                      key={np.nonprofit_name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg transition-colors ${
                        hasMilestones 
                          ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            hasMilestones ? 'bg-yellow-500/20' : 'bg-emerald-500/10'
                          }`}>
                            {hasMilestones ? (
                              <Trophy className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <Heart className="h-5 w-5 text-emerald-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{np.nonprofit_name}</p>
                            {hasMilestones ? (
                              <p className="text-sm text-yellow-600 font-medium">
                                🏆 {np.milestones_contributed} Milestone{np.milestones_contributed !== 1 ? 's' : ''} Achieved 🎉
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Progress: {formatCents(np.progress_cents)} / $777
                              </p>
                            )}
                          </div>
                        </div>
                        {hasMilestones && np.last_order_date && (
                          <span className="text-xs text-muted-foreground">
                            Last: {formatDate(np.last_order_date)}
                          </span>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {!hasMilestones || np.progress_cents > 0 ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Impact Status: {progressPercent}% to Milestone 🎯</span>
                            <span>{formatCents(MILESTONE_TARGET - np.progress_cents)} remaining</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-500/10 rounded-md px-3 py-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Impact Verified: ${(np.milestones_contributed * 777).toLocaleString()} Completed</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Earned Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Milestone Badges Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            {achievedBadges.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Complete your first $777 milestone impact to start earning badges!
                </p>
                <Button onClick={() => navigate("/products")}>
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {achievedBadges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex flex-col items-center p-4 rounded-xl ${badge.colors.bg} border ${badge.colors.border}`}
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <span className={`text-sm font-bold ${badge.colors.text}`}>
                      {badge.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {badge.milestonesRequired} milestone{badge.milestonesRequired !== 1 ? 's' : ''}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Locked & In-Progress Badges Preview */}
            {achievedBadges.length < MILESTONE_BADGE_TIERS.length && (
              <div className="mt-8">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">
                  Upcoming Badges
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {MILESTONE_BADGE_TIERS.filter(
                    (tier) => !achievedBadges.find((a) => a.id === tier.id)
                  ).map((tier) => {
                    const isNextBadge = nextBadge?.id === tier.id;
                    const tierProgress = isNextBadge ? progress.percentage : 0;
                    
                    return (
                      <div
                        key={tier.id}
                        className={`relative flex flex-col items-center p-4 rounded-xl border transition-all ${
                          isNextBadge 
                            ? 'bg-gradient-to-b from-primary/5 to-transparent border-primary/30' 
                            : 'bg-muted/30 border-dashed border-muted-foreground/20 opacity-50'
                        }`}
                      >
                        {/* Lock icon for fully locked badges */}
                        {!isNextBadge && (
                          <div className="absolute top-2 right-2">
                            <Lock className="h-3 w-3 text-muted-foreground/40" />
                          </div>
                        )}
                        
                        <div className={`p-3 rounded-full mb-2 text-2xl ${
                          isNextBadge ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          {tier.icon}
                        </div>
                        <span className={`text-xs font-medium ${
                          isNextBadge ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {tier.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {tier.milestonesRequired} milestones
                        </span>
                        
                        {/* Progress indicator for next badge */}
                        {isNextBadge && (
                          <div className="w-full mt-2 space-y-1">
                            <Progress value={tierProgress} className="h-1.5" />
                            <p className="text-[10px] text-center text-primary font-medium">
                              {milestonesCompleted}/{tier.milestonesRequired} ({tierProgress}%)
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impact Journey Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Your Impact Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No contributions yet. Start making an impact today!
                </p>
                <Button onClick={() => navigate("/products")}>
                  Make Your First Purchase
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {donations.slice(0, 10).map((donation, index) => {
                  return (
                    <motion.div
                      key={donation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                        donation.is_milestone 
                          ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          donation.is_milestone 
                            ? 'bg-yellow-500/20' 
                            : 'bg-primary/10'
                        }`}>
                          {donation.is_milestone ? (
                            <Trophy className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <Heart className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {donation.nonprofit_name || "General Impact"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(donation.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        {donation.is_milestone ? (
                          <span className="text-xs bg-yellow-500/20 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Milestone Achieved 🎉
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {formatCents(donation.amount_cents)} contributed
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {donations.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    And {donations.length - 10} more contributions...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
