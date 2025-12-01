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
  Gift
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  MILESTONE_TIERS, 
  getAchievedTiers, 
  getCurrentTier, 
  getNextTier,
  getProgressToNextTier,
  formatCents,
  MilestoneTier 
} from "@/lib/milestone-tiers";
import MilestoneAchievementBadge from "@/components/MilestoneAchievementBadge";
import { Progress } from "@/components/ui/progress";
import { 
  markMilestonesAsSeen, 
  getUncelebratedMilestones, 
  markMilestonesAsCelebrated 
} from "@/hooks/useUnseenMilestones";
import confetti from "canvas-confetti";

interface Donation {
  id: string;
  amount_cents: number;
  created_at: string;
  nonprofit_name: string | null;
  nonprofit_ein: string | null;
}

export default function DonorProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalDonatedCents, setTotalDonatedCents] = useState(0);
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

        console.log('[DonorProfile] Fetching donations for:', user.email);
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

        // Fetch all donations for this user
        const { data: donationData, error } = await supabase
          .from("donations")
          .select("id, amount_cents, created_at, nonprofit_name, nonprofit_ein")
          .eq("customer_email", user.email)
          .order("created_at", { ascending: false });

        if (error) {
          console.error('[DonorProfile] Error fetching donations:', error);
          throw error;
        }

        console.log('[DonorProfile] Donations fetched:', donationData);
        setDonations(donationData || []);
        
        const total = (donationData || []).reduce(
          (sum, d) => sum + (d.amount_cents || 0), 
          0
        );
        console.log('[DonorProfile] Total donated cents:', total);
        setTotalDonatedCents(total);
      } catch (error) {
        console.error("[DonorProfile] Error fetching donor data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDonorData();
  }, [navigate]);

  const achievedTiers = getAchievedTiers(totalDonatedCents);
  const currentTier = getCurrentTier(totalDonatedCents);
  const nextTier = getNextTier(totalDonatedCents);
  const progress = getProgressToNextTier(totalDonatedCents);

  // Check for uncelebrated milestones and trigger confetti
  useEffect(() => {
    if (achievedTiers.length > 0 && !loading && !celebrationTriggered.current) {
      const uncelebrated = getUncelebratedMilestones(achievedTiers.map(t => t.id));
      
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
      markMilestonesAsSeen(achievedTiers.map(t => t.id));
    }
  }, [achievedTiers, loading]);

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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-full">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Donated</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCents(totalDonatedCents)}
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
                  <p className="text-sm text-muted-foreground">Current Tier</p>
                  <p className="text-2xl font-bold text-foreground">
                    {currentTier?.name || "Getting Started"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Gift className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Donations</p>
                  <p className="text-2xl font-bold text-foreground">
                    {donations.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress to Next Tier */}
        {nextTier && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Progress to {nextTier.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatCents(totalDonatedCents)} donated
                </span>
                <span className="text-muted-foreground">
                  {formatCents(nextTier.amountCents)} goal
                </span>
              </div>
              <Progress value={progress.percentage} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                {formatCents(progress.remainingCents)} more to reach {nextTier.name}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Earned Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Earned Milestone Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {achievedTiers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Make your first donation to start earning badges!
                </p>
                <Button onClick={() => navigate("/donate")}>
                  Make a Donation
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {achievedTiers.map((tier, index) => (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MilestoneAchievementBadge
                      tier={tier}
                      totalDonated={formatCents(totalDonatedCents)}
                      userName={userName || undefined}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Locked Badges Preview */}
            {achievedTiers.length < MILESTONE_TIERS.length && (
              <div className="mt-8">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">
                  Upcoming Badges
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {MILESTONE_TIERS.filter(
                    (tier) => !achievedTiers.find((a) => a.id === tier.id)
                  ).map((tier) => {
                    return (
                      <div
                        key={tier.id}
                        className="flex flex-col items-center p-4 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20 opacity-50"
                      >
                        <div className="p-3 bg-muted rounded-full mb-2 text-2xl">
                          {tier.icon}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {tier.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatCents(tier.amountCents)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Donation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No donations yet. Start making an impact today!
                </p>
                <Button onClick={() => navigate("/donate")}>
                  Make Your First Donation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {donations.map((donation, index) => (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Heart className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {donation.nonprofit_name || "General Donation"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(donation.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {formatCents(donation.amount_cents)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
