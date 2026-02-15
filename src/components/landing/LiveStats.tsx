import { useLiveStats } from "@/hooks/use-live-stats";

const LiveStats = () => {
  const stats = useLiveStats();

  const items = [
    { value: stats.expertsOnline, label: "Experts Online" },
    { value: `${stats.requestsToday.toLocaleString()}`, label: "Requests Today" },
    { value: `€${stats.paidOut.toLocaleString()}`, label: "Paid to Experts" },
    { value: `${stats.avgResponse}s`, label: "Avg Response" },
  ];

  return (
    <section className="border-y border-border bg-card/30 py-5">
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
