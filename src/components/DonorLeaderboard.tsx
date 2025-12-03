import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { MILESTONE_TIERS, formatCents } from "@/lib/milestone-tiers";
import confetti from "canvas-confetti";

interface TopDonor {
  donor_display_name: string;
  total_donated_cents: number;
  donation_count: number;
  highest_tier: string | null;
  rank: number;
}

// Track which donors have changed for highlight animation
const getChangedDonors = (prev: TopDonor[], next: TopDonor[]): Set<string> => {
  const changed = new Set<string>();
  
  next.forEach((donor) => {
    const prevDonor = prev.find(p => p.donor_display_name === donor.donor_display_name);
    if (!prevDonor) {
      // New donor on leaderboard
      changed.add(donor.donor_display_name);
    } else if (
      prevDonor.rank !== donor.rank ||
      prevDonor.total_donated_cents !== donor.total_donated_cents
    ) {
      // Position or amount changed
      changed.add(donor.donor_display_name);
    }
  });
  
  return changed;
};

// Check if any donor moved into top 3
const checkTop3Entry = (prev: TopDonor[], next: TopDonor[]): boolean => {
  return next.some((donor) => {
    if (donor.rank > 3) return false;
    const prevDonor = prev.find(p => p.donor_display_name === donor.donor_display_name);
    // New to top 3 or moved up into top 3
    return !prevDonor || prevDonor.rank > 3;
  });
};

// Trigger celebration confetti
const triggerConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ["#fbbf24", "#f59e0b", "#d97706", "#ffffff", "#fef3c7"];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

const getTierInfo = (tierId: string | null) => {
  if (!tierId) return null;
  return MILESTONE_TIERS.find((t) => t.id === tierId) || null;
};

export default function DonorLeaderboard() {
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [changedDonors, setChangedDonors] = useState<Set<string>>(new Set());
  const prevDonorsRef = useRef<TopDonor[]>([]);

  const fetchTopDonors = async () => {
    try {
      const { data, error } = await supabase.rpc("get_top_donors", {
        limit_count: 10,
      });

      if (error) throw error;
      
      const newDonors = data || [];
      
      // Detect changes and trigger highlight
      if (prevDonorsRef.current.length > 0) {
        const changed = getChangedDonors(prevDonorsRef.current, newDonors);
        if (changed.size > 0) {
          setChangedDonors(changed);
          // Clear highlight after animation
          setTimeout(() => setChangedDonors(new Set()), 2000);
        }
        
        // Trigger confetti if someone moved into top 3
        if (checkTop3Entry(prevDonorsRef.current, newDonors)) {
          triggerConfetti();
        }
      }
      
      prevDonorsRef.current = newDonors;
      setDonors(newDonors);
    } catch (error) {
      console.error("Error fetching top donors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopDonors();

    // Subscribe to real-time changes on the donations table
    const channel = supabase
      .channel('donor-leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations'
        },
        () => {
          // Refetch leaderboard when donations change
          fetchTopDonors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Award className="h-4 w-4 text-blue-400" />;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 via-gray-400/10 to-transparent border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 via-amber-600/10 to-transparent border-amber-600/30";
      default:
        return "bg-white/50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Printing + Purpose Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (donors.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Printing + Purpose Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Be the first to contribute and appear on the leaderboard!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-gray-200 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-100">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Printing + Purpose Leaderboard
        </CardTitle>
        <p className="text-sm text-gray-600">
          Celebrating our most generous supporters
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {donors.map((donor, index) => {
            const tierInfo = getTierInfo(donor.highest_tier);
            const isChanged = changedDonors.has(donor.donor_display_name);
            return (
              <motion.div
                key={donor.donor_display_name}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: isChanged ? [1, 1.02, 1] : 1,
                  boxShadow: isChanged 
                    ? ["0 0 0 0 rgba(234, 179, 8, 0)", "0 0 20px 4px rgba(234, 179, 8, 0.4)", "0 0 0 0 rgba(234, 179, 8, 0)"]
                    : "0 0 0 0 rgba(234, 179, 8, 0)"
                }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  delay: index * 0.05,
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                  scale: { duration: 0.6, ease: "easeInOut" },
                  boxShadow: { duration: 1.5, ease: "easeOut" }
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${getRankBg(
                  donor.rank
                )} transition-colors hover:scale-[1.02] ${
                  isChanged ? "ring-2 ring-yellow-400/50 ring-offset-1" : ""
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/80 shadow-sm">
                  {getRankIcon(donor.rank)}
                </div>

                {/* Donor Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">
                      {donor.donor_display_name}
                    </span>
                    {tierInfo && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${tierInfo.colors.bg} ${tierInfo.colors.border} border`}
                      >
                        <span className="text-xs">{tierInfo.icon}</span>
                        <span className={`text-[10px] font-bold ${tierInfo.colors.text}`}>
                          {tierInfo.name}
                        </span>
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {donor.donation_count} contribution
                    {donor.donation_count !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <motion.p
                    animate={isChanged ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`font-bold ${
                      donor.rank === 1
                        ? "text-yellow-600 text-lg"
                        : donor.rank <= 3
                        ? "text-amber-600"
                        : "text-gray-700"
                    }`}
                  >
                    {formatCents(donor.total_donated_cents)}
                  </motion.p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Total
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
