import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Props {
  isOnline: boolean;
  responseTimeMinutes?: number | null;
}

const AvailabilityBadge = ({ isOnline, responseTimeMinutes }: Props) => {
  if (isOnline) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-chart-2 animate-pulse" />
        Available now
      </Badge>
    );
  }

  if (responseTimeMinutes) {
    const label = responseTimeMinutes < 60
      ? `~${responseTimeMinutes}min response`
      : `~${Math.round(responseTimeMinutes / 60)}h response`;
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Clock className="h-3 w-3" />
        {label}
      </Badge>
    );
  }

  return null;
};

export default AvailabilityBadge;
