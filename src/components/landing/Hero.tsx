import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Shield, Clock, Users, Star, CheckCircle, Zap, Send } from "lucide-react";

const floatingTasks = [
  { title: "Fix Minecraft server TPS drops", category: "Gaming", budget: "€12", expert: "JM", rating: "4.9", delay: "0s", position: "top-[8%] left-[2%]", size: "w-[260px]", rotate: "-2deg" },
  { title: "Discord bot with slash commands", category: "Tech", budget: "€15", expert: "SK", rating: "5.0", delay: "0.3s", position: "top-[4%] right-[3%]", size: "w-[240px]", rotate: "1.5deg" },
  { title: "Logo redesign for startup", category: "Creative", budget: "€25", expert: "ER", rating: "4.8", delay: "0.6s", position: "bottom-[18%] left-[1%]", size: "w-[230px]", rotate: "1deg" },
  { title: "SEO audit + keyword report", category: "Business", budget: "€30", expert: "DL", rating: "4.7", delay: "0.9s", position: "bottom-[22%] right-[2%]", size: "w-[250px]", rotate: "-1.5deg" },
  { title: "Valorant coaching Silver→Gold", category: "Gaming", budget: "€20", expert: "AT", rating: "5.0", delay: "1.2s", position: "top-[42%] left-[0%]", size: "w-[220px]", rotate: "2deg" },
  { title: "Mix & master 2 tracks", category: "Music", budget: "€40", expert: "LT", rating: "4.9", delay: "1.5s", position: "top-[38%] right-[1%]", size: "w-[210px]", rotate: "-2.5deg" },
];

const Hero = () => {
  const [taskTitle, setTaskTitle] = useState("");
  const navigate = useNavigate();

  const handleQuickPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskTitle.trim()) {
      navigate(`/post-request?title=${encodeURIComponent(taskTitle.trim())}`);
    } else {
      navigate("/post-request");
    }
  };

  return (
    <section className="relative bg-background pt-20 pb-24 md:pt-28 md:pb-36 overflow-hidden min-h-[85vh] flex items-center">
      {/* Gradient blobs — asymmetric */}
      <div className="absolute top-[-10%] left-[-5%] h-[600px] w-[600px] rounded-full bg-primary/[0.07] blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-8%] h-[500px] w-[500px] rounded-full bg-primary/[0.05] blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] h-[300px] w-[300px] rounded-full bg-primary/[0.03] blur-[100px] pointer-events-none" />

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.012)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.012)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

      {/* Floating task cards — asymmetric, layered */}
      {floatingTasks.map((task, i) => (
        <div
          key={i}
          className={`absolute ${task.position} ${task.size} hidden lg:block pointer-events-none animate-fade-in`}
          style={{
            animationDelay: task.delay,
            transform: `rotate(${task.rotate})`,
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <div className="rounded-sm border border-border/30 bg-card/50 backdrop-blur-sm p-3.5 shadow-lg transition-all hover:border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-[9px] border-primary/20 text-primary/70 rounded-sm px-1.5 py-0">{task.category}</Badge>
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
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary/60" /></span>
                quoted
              </span>
            </div>
          </div>
        </div>
      ))}

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Live badge */}
          <div className="mb-8 inline-flex items-center gap-2 border border-border/40 bg-card/40 px-4 py-2 rounded-sm text-sm animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="text-primary font-bold">142 experts</span>
            <span className="text-muted-foreground">online right now</span>
          </div>

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] animate-fade-in [animation-delay:100ms]">
            Post a task.{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              Get it done.
            </span>
          </h1>

          <p className="mb-10 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in [animation-delay:200ms]">
            Describe what you need. Verified experts compete with fixed-price quotes in under 2 minutes.
          </p>

          {/* Inline task form — THE main CTA */}
          <form onSubmit={handleQuickPost} className="mx-auto max-w-xl mb-6 animate-fade-in [animation-delay:300ms]">
            <div className="flex gap-2 p-1.5 border border-border/50 bg-card/60 rounded-sm backdrop-blur-sm">
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder='e.g. "Fix my Minecraft server lag"'
                className="h-12 rounded-sm border-0 bg-transparent text-base placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button type="submit" size="lg" className="h-12 px-8 rounded-sm gap-2 font-bold shrink-0 text-base">
                Post Task <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </form>

          <p className="text-sm text-muted-foreground/70 mb-12 animate-fade-in [animation-delay:400ms]">
            Free to post · No commitment · Pay only when satisfied
          </p>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-10 text-sm text-muted-foreground animate-fade-in [animation-delay:500ms]">
            {[
              { icon: <Shield className="h-4 w-4" />, text: "Escrow-protected payments" },
              { icon: <Clock className="h-4 w-4" />, text: "~90s average response" },
              { icon: <Users className="h-4 w-4" />, text: "500+ verified experts" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-primary/60">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
