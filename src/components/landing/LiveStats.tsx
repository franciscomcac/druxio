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
    { icon: <Users className="h-5 w-5" />, value: stats.expertsOnline, label: "Experts Online" },
    { icon: <Zap className="h-5 w-5" />, value: stats.requestsToday, label: "Requests Today" },
    { icon: <DollarSign className="h-5 w-5" />, value: stats.paidOut, label: "Paid to Experts", prefix: "€" },
    { icon: <Clock className="h-5 w-5" />, value: stats.avgResponse, label: "Avg Response (sec)", suffix: "s" },
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
            <span className="text-sm font-medium text-muted-foreground">Live</span>
          </div>
          
          {statItems.map((stat, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {stat.icon}
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {stat.prefix}{stat.value.toLocaleString()}{stat.suffix}
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
