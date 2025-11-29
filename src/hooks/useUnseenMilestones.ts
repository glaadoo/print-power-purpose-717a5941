import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAchievedTiers } from "@/lib/milestone-tiers";

const SEEN_MILESTONES_KEY = "ppp_seen_milestones";

export function useUnseenMilestones() {
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkMilestones() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user?.email) {
          setUnseenCount(0);
          setLoading(false);
          return;
        }

        // Fetch total donations for this user
        const { data: donations } = await supabase
          .from("donations")
          .select("amount_cents")
          .eq("customer_email", user.email);

        const totalDonatedCents = (donations || []).reduce(
          (sum, d) => sum + (d.amount_cents || 0),
          0
        );

        // Get achieved tiers
        const achievedTiers = getAchievedTiers(totalDonatedCents);
        const achievedIds = achievedTiers.map(t => t.id);

        // Get seen milestones from localStorage
        const seenMilestones = JSON.parse(
          localStorage.getItem(SEEN_MILESTONES_KEY) || "[]"
        ) as string[];

        // Calculate unseen count
        const unseen = achievedIds.filter(id => !seenMilestones.includes(id));
        setUnseenCount(unseen.length);
      } catch (error) {
        console.error("Error checking milestones:", error);
        setUnseenCount(0);
      } finally {
        setLoading(false);
      }
    }

    checkMilestones();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkMilestones();
    });

    // Listen for custom event when milestones are marked as seen
    const handleMilestonesSeen = () => setUnseenCount(0);
    window.addEventListener("milestones-seen", handleMilestonesSeen);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("milestones-seen", handleMilestonesSeen);
    };
  }, []);

  return { unseenCount, loading };
}

export function markMilestonesAsSeen(tierIds: string[]) {
  const existing = JSON.parse(
    localStorage.getItem(SEEN_MILESTONES_KEY) || "[]"
  ) as string[];
  
  const updated = [...new Set([...existing, ...tierIds])];
  localStorage.setItem(SEEN_MILESTONES_KEY, JSON.stringify(updated));
  
  // Dispatch event to update nav badge
  window.dispatchEvent(new CustomEvent("milestones-seen"));
}
