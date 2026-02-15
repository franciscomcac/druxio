import { getClientRank, getRankIcon, type ClientRank } from "@/lib/client-rank";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface RankBadgeProps {
  totalSpent: number;
  showProgress?: boolean;
  size?: "sm" | "md";
}

const RankBadge = ({ totalSpent, showProgress = false, size = "sm" }: RankBadgeProps) => {
  const rank = getClientRank(totalSpent);
  const icon = getRankIcon(rank.rank);

  if (size === "sm") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${rank.color}`}>
              <span>{icon}</span>
              <span>{rank.label}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">{rank.label}</p>
            <p className="text-muted-foreground">€{rank.currentSpent.toFixed(0)} spent</p>
            {rank.nextThreshold !== null && (
              <p className="text-muted-foreground">€{rank.nextThreshold.toFixed(0)} for next tier</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className={`text-sm font-bold ${rank.color}`}>{rank.label}</span>
      </div>
      {showProgress && rank.nextThreshold !== null && (
        <div className="space-y-1">
          <Progress value={rank.progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">
            €{rank.currentSpent.toFixed(0)} / €{rank.nextThreshold.toFixed(0)}
          </p>
        </div>
      )}
    </div>
  );
};

export default RankBadge;
