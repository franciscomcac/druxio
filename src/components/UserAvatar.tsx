import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Deterministic color from a string (user ID or name).
 * Returns an HSL hue so we get consistent, vibrant colors.
 */
function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

const saturationOptions = [65, 70, 75];
const lightnessOptions = [45, 50, 55];

function getAvatarColor(seed: string) {
  const hue = hashToHue(seed);
  const sat = saturationOptions[Math.abs(seed.charCodeAt(0) || 0) % saturationOptions.length];
  const lit = lightnessOptions[Math.abs(seed.charCodeAt(1) || 0) % lightnessOptions.length];
  return `hsl(${hue}, ${sat}%, ${lit}%)`;
}

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  /** A stable unique ID (e.g. user UUID) for deterministic color. Falls back to name. */
  userId?: string | null;
  className?: string;
  iconClassName?: string;
}

/**
 * Renders a user avatar. If no image is set, shows a colored person
 * silhouette with a deterministic background color based on userId/name.
 */
const UserAvatar = ({ src, name, userId, className, iconClassName }: UserAvatarProps) => {
  const seed = userId || name || "user";
  const bgColor = getAvatarColor(seed);

  return (
    <Avatar className={cn("border border-border", className)}>
      {src && <AvatarImage src={src} alt={name || "User"} />}
      <AvatarFallback
        className="flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <User className={cn("text-white", iconClassName || "h-[55%] w-[55%]")} />
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
