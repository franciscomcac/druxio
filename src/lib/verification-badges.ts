import { differenceInDays } from "date-fns";

export interface VerificationBadge {
  label: string;
  icon: "shield" | "star" | "zap" | "rocket";
  color: string; // tailwind class
}

interface ProfileData {
  total_sessions?: number | null;
  rating_avg?: number | null;
  response_time_minutes?: number | null;
  created_at?: string | null;
}

export function getVerificationBadges(
  profile: ProfileData,
  reviewCount: number = 0,
  completedOrders: number = 0
): VerificationBadge[] {
  const badges: VerificationBadge[] = [];
  const orders = completedOrders || profile.total_sessions || 0;

  if (orders >= 10) {
    badges.push({ label: "Verified Expert", icon: "shield", color: "text-primary" });
  }

  if ((profile.rating_avg || 0) >= 4.8 && reviewCount >= 5) {
    badges.push({ label: "Top Rated", icon: "star", color: "text-yellow-500" });
  }

  if ((profile.response_time_minutes || Infinity) <= 10) {
    badges.push({ label: "Fast Responder", icon: "zap", color: "text-chart-2" });
  }

  if (
    orders >= 5 &&
    profile.created_at &&
    differenceInDays(new Date(), new Date(profile.created_at)) < 30
  ) {
    badges.push({ label: "Rising Star", icon: "rocket", color: "text-orange-500" });
  }

  return badges;
}
