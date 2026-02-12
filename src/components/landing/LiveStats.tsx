import { useEffect, useState } from "react";
import { Users, Zap, DollarSign, Clock } from "lucide-react";

const LiveStats = () => {
  const [stats, setStats] = useState({
    expertsOnline: 312,
    requestsToday: 1842,
    paidOut: 24000,
    avgResponse: 87,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        expertsOnline: Math.max(200, prev.expertsOnline + Math.floor(Math.random() * 3) - 1),
        requestsToday: prev.requestsToday + Math.floor(Math.random() * 3),
        paidOut: prev.paidOut + Math.floor(Math.random() * 50),
        avgResponse: Math.max(60, Math.min(120, prev.avgResponse + Math.floor(Math.random() * 5) - 2)),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { icon: <Users className="h-4 w-4" />, value: stats.expertsOnline, label: "Experts Online" },
    { icon: <Zap className="h-4 w-4" />, value: stats.requestsToday, label: "Requests Today" },
    { icon: <DollarSign className="h-4 w-4" />, value: stats.paidOut, label: "Paid to Experts", prefix: "€" },
    { icon: <Clock className="h-4 w-4" />, value: stats.avgResponse, label: "Avg Response", suffix: "s" },
  ];

  return (
    <section className="border-y border-border/30 bg-card/40 py-6 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Live</span>
          </div>

          {statItems.map((stat, index) => (
            <div key={index} className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] text-primary/70 group-hover:bg-primary/[0.15] transition-colors duration-300">
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground tabular-nums transition-all">
                  {stat.prefix}{stat.value.toLocaleString()}{stat.suffix}
                </p>
                <p className="text-[10px] text-muted-foreground leading-none">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
