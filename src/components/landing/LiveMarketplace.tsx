import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, TrendingUp, Zap } from "lucide-react";
import { useLiveStats } from "@/hooks/use-live-stats";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const feedPool = [
  { title: "Fix Minecraft plugin NullPointer error", category: "Gaming", budget: "€12", deadline: "30min" },
  { title: "Valorant coaching Silver → Gold", category: "Gaming", budget: "€20", deadline: "60min" },
  { title: "Discord bot slash commands not firing", category: "Tech", budget: "€8", deadline: "15min" },
  { title: "WordPress site speed optimization", category: "Tech", budget: "€18", deadline: "45min" },
  { title: "Set up Shopify dropshipping store", category: "Business", budget: "€35", deadline: "60min" },
  { title: "SEO audit + keyword research report", category: "Business", budget: "€30", deadline: "45min" },
  { title: "Twitch overlay + alerts package", category: "Creative", budget: "€30", deadline: "60min" },
  { title: "Logo redesign for startup", category: "Creative", budget: "€25", deadline: "45min" },
  { title: "Mix & master 2 tracks", category: "Music", budget: "€40", deadline: "60min" },
  { title: "Edit 10-min YouTube video", category: "Content", budget: "€30", deadline: "60min" },
  { title: "Beat production (trap / drill)", category: "Music", budget: "€50", deadline: "90min" },
  { title: "Python script for web scraping", category: "Tech", budget: "€20", deadline: "30min" },
  { title: "TikTok content strategy — 30 days", category: "Content", budget: "€25", deadline: "45min" },
  { title: "CS2 rank boost Gold Nova → MG", category: "Gaming", budget: "€25", deadline: "90min" },
];

const statuses = ["3 quotes", "2 quotes", "1 quote", "hired", "in progress", "5 quotes"];

const catColor: Record<string, string> = {
  Gaming: "142 71% 45%",
  Tech: "230 70% 62%",
  Business: "38 92% 55%",
  Creative: "280 65% 62%",
  Music: "330 75% 60%",
  Content: "190 85% 50%",
};

function FeedCard({ req }: { req: (typeof feedPool)[number] & { status: string; hot: boolean } }) {
  const color = catColor[req.category] ?? "230 70% 62%";
  return (
    <div className="glass w-[290px] shrink-0 rounded-lg p-4 mx-2 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-2.5">
        <Badge
          variant="outline"
          className="text-[10px] rounded-sm px-1.5 py-0 font-medium"
          style={{ borderColor: `hsl(${color} / 0.4)`, color: `hsl(${color})` }}
        >
          {req.category}
        </Badge>
        {req.hot && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
            <TrendingUp className="h-3 w-3" /> hot
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-foreground/90 leading-snug mb-3 line-clamp-2 h-10">{req.title}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-foreground tabular-nums">{req.budget}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {req.deadline}
        </span>
      </div>
      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        <span className="text-[11px] font-medium text-primary/90">{req.status}</span>
      </div>
    </div>
  );
}

/** Count-up that animates when it first scrolls into view. */
function StatCounter({ value, label, suffix = "", prefix = "" }: { value: number; label: string; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const start = performance.now();
          const step = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.floor(eased * value));
            if (p < 1) requestAnimationFrame(step);
            else setDisplay(value);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <p className="font-mono text-2xl sm:text-4xl font-bold text-foreground tabular-nums leading-none">
        {prefix}
        {display.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1.5 text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

const LiveMarketplace = () => {
  const stats = useLiveStats();
  const ref = useScrollReveal<HTMLElement>();

  // Two shuffled halves for the marquee rows, each duplicated for seamless loop.
  const [rows] = useState(() => {
    const shuffled = [...feedPool]
      .sort(() => Math.random() - 0.5)
      .map((r) => ({ ...r, status: statuses[Math.floor(Math.random() * statuses.length)], hot: Math.random() > 0.7 }));
    const mid = Math.ceil(shuffled.length / 2);
    return [shuffled.slice(0, mid), shuffled.slice(mid)];
  });

  return (
    <section ref={ref} className="relative overflow-hidden bg-background py-16 md:py-28">
      {/* Atmospheric glows */}
      <div className="glow-blob top-[-10%] left-[10%] h-[420px] w-[420px] bg-primary/[0.10]" />
      <div className="glow-blob bottom-[-15%] right-[5%] h-[380px] w-[380px] bg-primary/[0.07]" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center reveal">
          <div className="mb-4 inline-flex items-center gap-2 glass rounded-full px-3.5 py-1.5 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-foreground/80">The marketplace is live right now</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-3">
            Real tasks. <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">Real experts.</span> Live.
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-xl mx-auto">
            This isn't a demo. Peek at what people are getting done this minute and how fast the quotes roll in.
          </p>
        </div>

        {/* Live stat control panel — one frosted bar */}
        <div className="mx-auto mt-10 max-w-4xl glass-strong rounded-2xl p-5 sm:p-7 reveal delay-100">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
            <StatCounter value={stats.expertsOnline} label="Experts online" />
            <StatCounter value={stats.requestsToday} label="Requests today" />
            <StatCounter value={stats.paidOut} label="Paid to experts" prefix="€" />
            <StatCounter value={stats.avgResponse} label="Avg response" suffix="s" />
          </div>
        </div>
      </div>

      {/* Full-bleed marquee feed */}
      <div className="relative mt-12 md:mt-16 space-y-4 reveal delay-200">
        <div className="edge-fade-x marquee-pause overflow-hidden">
          <div className="marquee-track marquee-left">
            {[...rows[0], ...rows[0]].map((req, i) => (
              <FeedCard key={`a-${i}`} req={req} />
            ))}
          </div>
        </div>
        <div className="edge-fade-x marquee-pause overflow-hidden">
          <div className="marquee-track marquee-right">
            {[...rows[1], ...rows[1]].map((req, i) => (
              <FeedCard key={`b-${i}`} req={req} />
            ))}
          </div>
        </div>
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mt-12 flex flex-col items-center gap-3 reveal delay-300">
          <Link to="/post-request">
            <Button size="lg" className="gap-2 rounded-sm font-semibold shadow-glow hover:shadow-glow-lg transition-shadow duration-500">
              <Zap className="h-4 w-4" /> Post your task — get quotes in seconds
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">Free to post · No commitment · Pay only when satisfied</p>
        </div>
      </div>
    </section>
  );
};

export default LiveMarketplace;
