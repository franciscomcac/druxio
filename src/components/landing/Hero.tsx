import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveStats } from "@/hooks/use-live-stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Clock, Users, Star, ChevronDown } from "lucide-react";

const taskPool = [
  { title: "Discord bot with slash commands", category: "Tech", budget: "€15", expert: "SK", rating: "5.0" },
  { title: "Logo redesign for startup", category: "Creative", budget: "€25", expert: "ER", rating: "4.8" },
  { title: "SEO audit + keyword report", category: "Business", budget: "€30", expert: "DL", rating: "4.7" },
  { title: "Valorant coaching Silver→Gold", category: "Gaming", budget: "€20", expert: "AT", rating: "5.0" },
  { title: "Mix & master 2 tracks", category: "Music", budget: "€40", expert: "LT", rating: "4.9" },
  { title: "WordPress site speed optimization", category: "Tech", budget: "€18", expert: "MR", rating: "4.8" },
  { title: "Shopify store setup & theme", category: "Business", budget: "€35", expert: "KL", rating: "4.9" },
  { title: "Instagram growth strategy", category: "Business", budget: "€28", expert: "NP", rating: "4.9" },
  { title: "Podcast intro jingle creation", category: "Music", budget: "€35", expert: "AV", rating: "5.0" },
  { title: "Twitch overlay + alerts package", category: "Creative", budget: "€30", expert: "TS", rating: "4.8" },
  { title: "Python script for data scraping", category: "Tech", budget: "€20", expert: "RK", rating: "4.6" },
  { title: "Roblox game scripting help", category: "Gaming", budget: "€16", expert: "BN", rating: "4.9" },
  { title: "Brand identity kit for café", category: "Creative", budget: "€45", expert: "JW", rating: "5.0" },
  { title: "TikTok ad campaign setup", category: "Business", budget: "€25", expert: "CM", rating: "4.7" },
  { title: "Beat production (trap/drill)", category: "Music", budget: "€50", expert: "ZD", rating: "4.9" },
  { title: "Resume & LinkedIn profile rewrite", category: "Business", budget: "€22", expert: "PH", rating: "4.8" },
];

const placeholderExamples = [
  "Build a Discord bot for my server",
  "Design a logo for my startup",
  "Valorant coaching — Silver to Gold",
  "Write SEO copy for my landing page",
  "Mix and master my track",
  "Set up my WordPress site speed",
  "Create a TikTok ad campaign",
  "Make a Twitch overlay package",
  "Help with Python data scraping",
  "Roblox scripting for my game",
  "Instagram growth strategy for my brand",
  "Set up my Shopify store",
  "Podcast intro jingle creation",
  "Brand identity kit for my café",
  "Rewrite my resume and LinkedIn",
];

const cardSlots = [
  { position: "top-[6%] left-[2%]", size: "w-[260px]", rotate: "-2deg" },
  { position: "top-[4%] right-[3%]", size: "w-[240px]", rotate: "1.5deg" },
  { position: "bottom-[4%] left-[1%]", size: "w-[230px]", rotate: "1deg" },
  { position: "bottom-[2%] right-[2%]", size: "w-[250px]", rotate: "-1.5deg" },
  { position: "top-[38%] left-[0%]", size: "w-[220px]", rotate: "2deg" },
  { position: "top-[36%] right-[1%]", size: "w-[210px]", rotate: "-2.5deg" },
];

const Hero = () => {
  const [taskTitle, setTaskTitle] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const navigate = useNavigate();
  const stats = useLiveStats();

  const [slotIndices, setSlotIndices] = useState(() =>
    cardSlots.map((_, i) => i % taskPool.length)
  );
  const [fadingSlots, setFadingSlots] = useState<boolean[]>(() =>
    cardSlots.map(() => false)
  );

  // Rotate floating task cards
  useEffect(() => {
    const interval = setInterval(() => {
      const slotToChange = Math.floor(Math.random() * cardSlots.length);

      setFadingSlots(prev => {
        const next = [...prev];
        next[slotToChange] = true;
        return next;
      });

      setTimeout(() => {
        setSlotIndices(prev => {
          const next = [...prev];
          let newIdx: number;
          do {
            newIdx = Math.floor(Math.random() * taskPool.length);
          } while (prev.includes(newIdx));
          next[slotToChange] = newIdx;
          return next;
        });
        setFadingSlots(prev => {
          const next = [...prev];
          next[slotToChange] = false;
          return next;
        });
      }, 400);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Rotate placeholder text every 3s (only when not typing)
  useEffect(() => {
    if (taskTitle) return;
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIdx(prev => (prev + 1) % placeholderExamples.length);
        setPlaceholderVisible(true);
      }, 350);
    }, 3000);
    return () => clearInterval(interval);
  }, [taskTitle]);

  const handleQuickPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskTitle.trim()) {
      navigate(`/post-request?title=${encodeURIComponent(taskTitle.trim())}`);
    } else {
      navigate("/post-request");
    }
  };

  return (
    <section id="hero-section" className="relative bg-background pt-12 pb-16 md:pt-16 md:pb-24 overflow-hidden min-h-[calc(100vh-4rem)] flex items-center">
      {/* Gradient blobs */}
      <div className="absolute top-[-10%] left-[-5%] h-[600px] w-[600px] rounded-full bg-primary/[0.07] blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-8%] h-[500px] w-[500px] rounded-full bg-primary/[0.05] blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] h-[300px] w-[300px] rounded-full bg-primary/[0.03] blur-[100px] pointer-events-none" />

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.012)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.012)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

      {/* Floating task cards — cycling */}
      {cardSlots.map((slot, i) => {
        const task = taskPool[slotIndices[i]];
        return (
          <div
            key={i}
            className={`absolute ${slot.position} ${slot.size} hidden xl:block pointer-events-none transition-opacity duration-400`}
            style={{
              transform: `rotate(${slot.rotate})`,
              opacity: fadingSlots[i] ? 0 : 1,
              transitionDuration: "400ms",
            }}
          >
            <div className="rounded-sm border border-border bg-card/90 backdrop-blur-sm p-3.5 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[9px] rounded-sm px-1.5 py-0" style={{ borderColor: 'hsl(230 60% 60% / 0.4)', color: 'hsl(230 60% 70%)' }}>{task.category}</Badge>
                <span className="text-xs font-bold text-foreground">{task.budget}</span>
              </div>
              <p className="text-xs font-medium text-foreground/80 mb-2 leading-snug">{task.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="h-5 w-5 rounded-sm bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">{task.expert}</div>
                <div className="flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                  <span>{task.rating}</span>
                </div>
                <span className="ml-auto flex items-center gap-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary/60" />
                  </span>
                  quoted
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Live badge */}
          <div className="mb-8 inline-flex items-center gap-2 border border-border bg-card/40 px-4 py-2 rounded-sm text-sm animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: 'hsl(188 100% 48% / 0.6)' }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(188 100% 48%)' }} />
            </span>
            <span className="font-bold" style={{ color: 'hsl(188 100% 48%)' }}>{stats.expertsOnline} experts</span>
            <span className="text-foreground/70">online right now</span>
          </div>

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] animate-fade-in [animation-delay:100ms]">
            Post a task.{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              Get it done.
            </span>
          </h1>

          <p className="mb-10 text-lg md:text-xl text-foreground/60 max-w-xl mx-auto leading-relaxed animate-fade-in [animation-delay:200ms]">
            Describe what you need. Verified experts compete with fixed-price quotes in under 2 minutes.
          </p>

          {/* Inline task form */}
          <form onSubmit={handleQuickPost} className="mx-auto max-w-xl mb-6 animate-fade-in [animation-delay:300ms]">
            <div className="flex gap-2 p-1.5 border border-border bg-card/60 rounded-sm backdrop-blur-sm">
              <div className="relative flex-1">
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder=""
                  className="h-12 rounded-sm border-0 bg-transparent text-base placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {/* Animated placeholder — only shown when input is empty */}
                {!taskTitle && (
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground/50 truncate max-w-[calc(100%-1.5rem)] transition-opacity duration-300 select-none"
                    style={{ opacity: placeholderVisible ? 1 : 0 }}
                  >
                    e.g. &ldquo;{placeholderExamples[placeholderIdx]}&rdquo;
                  </span>
                )}
              </div>
              <Button type="submit" size="lg" className="h-12 px-8 rounded-sm gap-2 font-bold shrink-0 text-base">
                Post Task <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </form>

          <p className="text-sm text-muted-foreground/70 mb-12 animate-fade-in [animation-delay:400ms]">
            Free to post · No commitment · Pay only when satisfied
          </p>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 animate-fade-in [animation-delay:500ms]">
            {[
              { icon: <Shield className="h-5 w-5" />, text: "Escrow-protected payments" },
              { icon: <Clock className="h-5 w-5" />, text: "~90s average response" },
              { icon: <Users className="h-5 w-5" />, text: "500+ verified experts" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-base text-muted-foreground">
                <span className="text-primary/70">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Scroll down arrow */}
          <button
            onClick={() => {
              const hero = document.getElementById("hero-section");
              if (hero) {
                const nextSection = hero.nextElementSibling;
                nextSection?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="mt-10 mx-auto flex flex-col items-center gap-1 text-muted-foreground/60 hover:text-primary transition-colors animate-fade-in [animation-delay:700ms] cursor-pointer"
            aria-label="Scroll down"
          >
            <span className="text-xs">Scroll down</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
