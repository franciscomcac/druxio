import { useEffect, useState } from "react";
import { Users, Video, DollarSign, MapPin } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
}

const LiveStats = () => {
  const [stats, setStats] = useState({
    mentorsOnline: 312,
    sessionsToday: 5420,
    paidOut: 24000,
    activeNow: 47,
  });

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        mentorsOnline: prev.mentorsOnline + Math.floor(Math.random() * 3) - 1,
        sessionsToday: prev.sessionsToday + Math.floor(Math.random() * 5),
        paidOut: prev.paidOut + Math.floor(Math.random() * 100),
        activeNow: prev.activeNow + Math.floor(Math.random() * 3) - 1,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const statItems: StatItem[] = [
    {
      icon: <Users className="h-5 w-5" />,
      value: stats.mentorsOnline,
      label: "Mentors Online",
    },
    {
      icon: <Video className="h-5 w-5" />,
      value: stats.sessionsToday,
      label: "Sessions Today",
      suffix: "",
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      value: stats.paidOut,
      label: "Paid to Mentors",
      suffix: "$",
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      value: stats.activeNow,
      label: "Active Now (Global)",
    },
  ];

  return (
    <section className="border-y border-border bg-card/50 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-muted-foreground">Live Stats</span>
          </div>
          
          {statItems.map((stat, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {stat.icon}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {stat.suffix}
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
