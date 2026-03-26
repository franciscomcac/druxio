import { ShieldCheck, Star, Zap, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerificationBadge } from "@/lib/verification-badges";

const iconMap = {
  shield: ShieldCheck,
  star: Star,
  zap: Zap,
  rocket: Rocket,
};

interface VerificationBadgesProps {
  badges: VerificationBadge[];
  size?: "sm" | "md";
}

const VerificationBadges = ({ badges, size = "sm" }: VerificationBadgesProps) => {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => {
        const Icon = iconMap[badge.icon];
        return (
          <Badge
            key={badge.label}
            variant="outline"
            className={`gap-1 ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}`}
          >
            <Icon className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} ${badge.color}`} />
            {badge.label}
          </Badge>
        );
      })}
    </div>
  );
};

export default VerificationBadges;
