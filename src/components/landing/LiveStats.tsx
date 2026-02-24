import { useLiveStats } from "@/hooks/use-live-stats";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const LiveStats = () => {
  const stats = useLiveStats();
  const ref = useScrollReveal<HTMLElement>();

  const items = [
    { value: stats.expertsOnline, label: "Experts Online" },
    { value: `${stats.requestsToday.toLocaleString()}`, label: "Requests Today" },
    { value: `€${stats.paidOut.toLocaleString()}`, label: "Paid to Experts" },
    { value: `${stats.avgResponse}s`, label: "Avg Response" },
  ];

  return (
    <section ref={ref} className="border-y border-border bg-card/30 py-4 md:py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-10 md:gap-20">
          {items.map((stat, i) => (
            <div
              key={i}
              className={`text-center reveal delay-${i * 100 + 100}`}
            >
              <p className="text-xl sm:text-3xl font-extrabold text-primary tabular-nums">
                {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-0.5 sm:mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveStats;
