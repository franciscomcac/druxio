import { useEffect, useState } from "react";

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

  const items = [
    { value: stats.expertsOnline, label: "Experts Online" },
    { value: `${stats.requestsToday.toLocaleString()}`, label: "Requests Today" },
    { value: `€${stats.paidOut.toLocaleString()}`, label: "Paid to Experts" },
    { value: `${stats.avgResponse}s`, label: "Avg Response" },
  ];

  return (
    <section className="border-y border-border/30 bg-card/30 py-5">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {items.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">
                {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
