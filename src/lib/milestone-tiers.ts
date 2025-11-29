export interface MilestoneTier {
  id: string;
  name: string;
  amountCents: number;
  icon: string;
  title: string;
  colors: {
    primary: string;
    secondary: string;
    gradient: string;
    text: string;
    bg: string;
    border: string;
  };
}

export const MILESTONE_TIERS: MilestoneTier[] = [
  {
    id: "bronze",
    name: "Bronze Giver",
    amountCents: 10000, // $100
    icon: "🥉",
    title: "$100 MILESTONE",
    colors: {
      primary: "from-amber-600 to-amber-800",
      secondary: "amber",
      gradient: "from-amber-600 via-orange-700 to-amber-800",
      text: "text-amber-700",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
  },
  {
    id: "silver",
    name: "Silver Supporter",
    amountCents: 25000, // $250
    icon: "🥈",
    title: "$250 MILESTONE",
    colors: {
      primary: "from-gray-400 to-gray-600",
      secondary: "gray",
      gradient: "from-gray-400 via-slate-500 to-gray-600",
      text: "text-gray-600",
      bg: "bg-gray-500/10",
      border: "border-gray-400/30",
    },
  },
  {
    id: "gold",
    name: "Gold Champion",
    amountCents: 50000, // $500
    icon: "🥇",
    title: "$500 MILESTONE",
    colors: {
      primary: "from-yellow-400 to-yellow-600",
      secondary: "yellow",
      gradient: "from-yellow-400 via-amber-500 to-yellow-600",
      text: "text-yellow-600",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    },
  },
  {
    id: "platinum",
    name: "Platinum Hero",
    amountCents: 77700, // $777
    icon: "💎",
    title: "$777 MILESTONE",
    colors: {
      primary: "from-purple-400 to-indigo-600",
      secondary: "purple",
      gradient: "from-purple-400 via-violet-500 to-indigo-600",
      text: "text-purple-600",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
    },
  },
  {
    id: "diamond",
    name: "Diamond Legend",
    amountCents: 100000, // $1000
    icon: "👑",
    title: "$1,000 MILESTONE",
    colors: {
      primary: "from-cyan-400 to-blue-600",
      secondary: "cyan",
      gradient: "from-cyan-400 via-sky-500 to-blue-600",
      text: "text-cyan-600",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
    },
  },
];

export function getAchievedTiers(totalCents: number): MilestoneTier[] {
  return MILESTONE_TIERS.filter((tier) => totalCents >= tier.amountCents);
}

export function getCurrentTier(totalCents: number): MilestoneTier | null {
  const achieved = getAchievedTiers(totalCents);
  return achieved.length > 0 ? achieved[achieved.length - 1] : null;
}

export function getNextTier(totalCents: number): MilestoneTier | null {
  const nextTier = MILESTONE_TIERS.find((tier) => totalCents < tier.amountCents);
  return nextTier || null;
}

export function getProgressToNextTier(totalCents: number): {
  nextTier: MilestoneTier | null;
  percentage: number;
  remainingCents: number;
} {
  const nextTier = getNextTier(totalCents);
  
  if (!nextTier) {
    return { nextTier: null, percentage: 100, remainingCents: 0 };
  }

  const previousTierAmount = getCurrentTier(totalCents)?.amountCents || 0;
  const tierRange = nextTier.amountCents - previousTierAmount;
  const progressInTier = totalCents - previousTierAmount;
  const percentage = Math.min(100, Math.round((progressInTier / tierRange) * 100));
  const remainingCents = nextTier.amountCents - totalCents;

  return { nextTier, percentage, remainingCents };
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
