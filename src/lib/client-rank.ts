export interface ClientRank {
  rank: string;
  division: number; // 1, 2, 3 (1 = highest within rank)
  label: string; // e.g. "Gold II"
  color: string; // tailwind color token
  nextThreshold: number | null;
  currentSpent: number;
  progress: number; // 0-100 progress to next division
}

const RANKS = [
  { name: "Iron",      threshold: 0,     color: "text-muted-foreground" },
  { name: "Bronze",    threshold: 50,    color: "text-amber-700 dark:text-amber-600" },
  { name: "Silver",    threshold: 150,   color: "text-slate-400 dark:text-slate-300" },
  { name: "Gold",      threshold: 350,   color: "text-yellow-500 dark:text-yellow-400" },
  { name: "Platinum",  threshold: 750,   color: "text-cyan-500 dark:text-cyan-400" },
  { name: "Diamond",   threshold: 1500,  color: "text-blue-400 dark:text-blue-300" },
  { name: "Sapphire",  threshold: 3000,  color: "text-indigo-500 dark:text-indigo-400" },
  { name: "Ruby",      threshold: 6000,  color: "text-red-500 dark:text-red-400" },
  { name: "Legendary", threshold: 12000, color: "text-purple-500 dark:text-purple-400" },
] as const;

const DIVISION_LABELS = ["III", "II", "I"] as const;

export function getClientRank(totalSpent: number): ClientRank {
  const spent = Math.max(0, totalSpent);

  // Find which rank tier
  let rankIndex = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (spent >= RANKS[i].threshold) {
      rankIndex = i;
      break;
    }
  }

  const currentRank = RANKS[rankIndex];
  const nextRank = RANKS[rankIndex + 1];

  // Calculate division within rank
  const rankFloor = currentRank.threshold;
  const rankCeiling = nextRank ? nextRank.threshold : currentRank.threshold * 2;
  const rankRange = rankCeiling - rankFloor;
  const divisionSize = rankRange / 3;

  const spentInRank = spent - rankFloor;
  let division: number;

  if (spentInRank >= divisionSize * 2) {
    division = 1; // Highest
  } else if (spentInRank >= divisionSize) {
    division = 2;
  } else {
    division = 3; // Lowest
  }

  // Progress to next division/rank
  const divisionFloor = rankFloor + (3 - division) * divisionSize;
  const divisionCeiling = divisionFloor + divisionSize;
  const progress = Math.min(100, ((spent - divisionFloor) / (divisionCeiling - divisionFloor)) * 100);

  const nextThreshold = division === 1 && nextRank ? nextRank.threshold : divisionCeiling;

  return {
    rank: currentRank.name,
    division,
    label: `${currentRank.name} ${DIVISION_LABELS[division - 1]}`,
    color: currentRank.color,
    nextThreshold: currentRank.name === "Legendary" && division === 1 ? null : nextThreshold,
    currentSpent: spent,
    progress,
  };
}

export function getRankIcon(rank: string): string {
  const icons: Record<string, string> = {
    Iron: "⚔️",
    Bronze: "🥉",
    Silver: "🥈",
    Gold: "🥇",
    Platinum: "💎",
    Diamond: "💠",
    Sapphire: "🔷",
    Ruby: "♦️",
    Legendary: "👑",
  };
  return icons[rank] || "⚔️";
}
