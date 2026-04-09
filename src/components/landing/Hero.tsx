import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveStats } from "@/hooks/use-live-stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Clock, Users, Star, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

const categoryBadges = ["Tech", "Creative", "Music", "Gaming", "Business", "Fitness", "Content", "Languages"];

const cardSlots = [
  { position: "top-[6%] left-[2%]", size: "w-[260px]", rotate: "-2deg" },
  { position: "top-[4%] right-[3%]", size: "w-[240px]", rotate: "1.5deg" },
  { position: "bottom-[4%] left-[1%]", size: "w-[230px]", rotate: "1deg" },
  { position: "bottom-[2%] right-[2%]", size: "w-[250px]", rotate: "-1.5deg" },
  { position: "top-[38%] left-[0%]", size: "w-[220px]", rotate: "2.5deg" },
  { position: "top-[36%] right-[1%]", size: "w-[210px]", rotate: "-3deg" },
];

const Hero = () => {
  const [taskTitle, setTaskTitle] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [previewCategory] = useState(() => categoryBadges[Math.floor(Math.random() * categoryBadges.length)]);
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
      setFadingSlots(prev => { const next = [...prev]; next[slotToChange] = true; return next; });
      setTimeout(() => {
        setSlotIndices(prev => {
          const next = [...prev];
          let newIdx: number;
          do { newIdx = Math.floor(Math.random() * taskPool.length); } while (prev.includes(newIdx));
          next[slotToChange] = newIdx;
          return next;
        });
        setFadingSlots(prev => { const next = [...prev]; next[slotToChange] = false; return next; });
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Rotate placeholder text
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

  const showPreview = taskTitle.trim().length > 5;

  return (
    <section id="hero-section" className="relative bg-background pt-6 pb-8 md:pt-16 md:pb-24 overflow-hidden md:min-h-[calc(100vh-3.5rem)] flex items-center">
      {/* Gradient blobs */}
      <div className="absolute top-[-10%] left-[-5%] h-[600px] w-[600px] rounded-full bg-primary/[0.07] blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-8%] h-[500px] w-[500px] rounded-full bg-primary/[0.05] blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.012)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.012)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

      {/* Floating task cards — cycling (desktop only) */}
      {cardSlots.map((slot, i) => {
        const task = taskPool[slotIndices[i]];
        return (
          <div
            key={i}
            className={`absolute ${slot.position} ${slot.size} hidden xl:block pointer-events-none transition-opacity duration-400`}
            style={{ transform: `rotate(${slot.rotate})`, opacity: fadingSlots[i] ? 0 : 1, transitionDuration: "400ms" }}
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
          <div className="mb-5 md:mb-8 inline-flex items-center gap-2 border border-border bg-card/40 px-3 py-1.5 md:px-4 md:py-2 rounded-sm text-xs md:text-sm animate-fade-in">
            <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: 'hsl(188 100% 48% / 0.6)' }} />
              <span className="relative inline-flex h-2 w-2 md:h-2.5 md:w-2.5 rounded-full" style={{ backgroundColor: 'hsl(188 100% 48%)' }} />
            </span>
            <span className="font-bold" style={{ color: 'hsl(188 100% 48%)' }}>{stats.expertsOnline} experts</span>
            <span className="text-foreground/70">online now</span>
          </div>

          {/* Typography contrast: lighter "Tell us what you need." + heavier "We'll find someone great." */}
          <h1 className="mb-4 md:mb-6 text-3xl tracking-tight text-foreground sm:text-5xl md:text-7xl lg:text-8xl leading-[1.1] animate-fade-in [animation-delay:100ms]">
            <span className="font-extrabold">Post a task.</span>{" "}
            <span className="font-extrabold bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              Get it done.
            </span>
          </h1>

          <p className="mb-6 md:mb-10 text-sm md:text-xl text-foreground/60 max-w-xl mx-auto leading-relaxed animate-fade-in [animation-delay:200ms]">
            Describe your task, get quotes in seconds. Pay only when you're happy.
          </p>

          {/* Inline task form */}
          <form onSubmit={handleQuickPost} className="mx-auto max-w-xl mb-4 md:mb-6 animate-fade-in [animation-delay:300ms]">
            <div className="flex flex-col sm:flex-row gap-2 p-1.5 border border-border bg-card/60 rounded-sm backdrop-blur-sm">
              <div className="relative flex-1">
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder=""
                  aria-label="Describe your task"
                  className="h-11 md:h-12 rounded-sm border-0 bg-transparent text-sm md:text-base placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {!taskTitle && (
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm md:text-base text-muted-foreground/50 truncate max-w-[calc(100%-1.5rem)] transition-opacity duration-300 select-none"
                    style={{ opacity: placeholderVisible ? 1 : 0 }}
                  >
                    e.g. &ldquo;{placeholderExamples[placeholderIdx]}&rdquo;
                  </span>
                )}
              </div>
              <Button type="submit" size="lg" className="h-11 md:h-12 px-6 md:px-8 rounded-sm gap-2 font-bold shrink-0 text-sm md:text-base w-full sm:w-auto">
                Post a Task <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </form>

          <p className="text-xs md:text-sm text-muted-foreground/70 mb-4 md:mb-6 animate-fade-in [animation-delay:400ms]">
            Free to post · No commitment · Pay only when satisfied
          </p>

          {/* Live task preview card */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="mx-auto max-w-sm rounded-lg border border-primary/20 bg-card p-4 mb-6 text-left shadow-lg animate-fade-in"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Your task preview</p>
                    <h3 className="text-sm font-semibold text-foreground truncate">{taskTitle}</h3>
                  </div>
                  <Badge variant="secondary" className="ml-3 shrink-0 text-[10px]">{previewCategory}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Expert is quoting…
                </div>
                <div className="mt-3 flex gap-2">
                  {[
                    { initials: "SK", gradient: "from-blue-500 to-indigo-500" },
                    { initials: "ER", gradient: "from-emerald-400 to-teal-500" },
                    { initials: "AT", gradient: "from-amber-400 to-orange-500" },
                  ].map((expert, j) => (
                    <div
                      key={j}
                      className={`h-7 w-7 rounded-full bg-gradient-to-br ${expert.gradient} flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-card`}
                      style={{ animationDelay: `${j * 200}ms` }}
                    >
                      {expert.initials}
                    </div>
                  ))}
                  <span className="text-[11px] text-muted-foreground self-center ml-1">3 experts online</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 md:gap-12 animate-fade-in [animation-delay:500ms]">
            {[
              { icon: <Shield className="h-4 w-4 md:h-5 md:w-5" />, text: "Your money is safe" },
              { icon: <Clock className="h-4 w-4 md:h-5 md:w-5" />, text: "Replies in under 2 min" },
              { icon: <Users className="h-4 w-4 md:h-5 md:w-5" />, text: "500+ verified pros" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs md:text-base text-muted-foreground">
                <span className="text-primary/70">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Scroll down arrow */}
          <button
            onClick={() => {
              const hero = document.getElementById("hero-section");
              if (hero) hero.nextElementSibling?.scrollIntoView({ behavior: "smooth" });
            }}
            className="mt-8 md:mt-10 mx-auto hidden sm:flex flex-col items-center gap-1 text-muted-foreground/60 hover:text-primary transition-colors animate-fade-in [animation-delay:700ms] cursor-pointer"
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
