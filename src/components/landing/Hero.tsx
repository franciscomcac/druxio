import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Shield, Clock, Users, Zap } from "lucide-react";

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
    <section className="relative bg-background pt-16 pb-20 md:pt-24 md:pb-28">
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.015)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.015)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Live badge */}
          <div className="mb-6 inline-flex items-center gap-2 border border-border/50 bg-card/60 px-3 py-1.5 rounded-sm text-xs font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-primary font-semibold">142 experts</span> online right now
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl leading-[1.1]">
            Post a task.{" "}
            <span className="text-primary">Get it done.</span>
          </h1>

          <p className="mb-8 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Describe what you need. Verified experts compete with fixed-price quotes in under 2 minutes.
          </p>

          {/* Inline task form — THE main CTA */}
          <form onSubmit={handleQuickPost} className="mx-auto max-w-lg mb-8">
            <div className="flex gap-2">
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder='e.g. "Fix my Minecraft server lag"'
                className="h-12 rounded-sm border-border/60 bg-card/80 text-base placeholder:text-muted-foreground/60"
              />
              <Button type="submit" size="lg" className="h-12 px-6 rounded-sm gap-2 font-semibold shrink-0">
                Post Task <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <p className="text-xs text-muted-foreground mb-10">
            Free to post · No commitment · Pay only when satisfied
          </p>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm text-muted-foreground">
            {[
              { icon: <Shield className="h-4 w-4" />, text: "Escrow-protected payments" },
              { icon: <Clock className="h-4 w-4" />, text: "~90s average response" },
              { icon: <Users className="h-4 w-4" />, text: "500+ verified experts" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-primary/70">{item.icon}</span>
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
