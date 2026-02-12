import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Clock, Shield, Zap, Star, Send, CheckCircle, TrendingUp, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-background pt-20 pb-28 md:pt-28 md:pb-40">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-[10%] h-[700px] w-[700px] rounded-full bg-primary/[0.06] blur-[150px] animate-glow-pulse" />
        <div className="absolute top-[50%] -left-[20%] h-[600px] w-[600px] rounded-full bg-primary/[0.04] blur-[130px] animate-glow-pulse [animation-delay:1.5s]" />
        <div className="absolute -bottom-40 right-[30%] h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[100px] animate-glow-pulse [animation-delay:3s]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.02)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid gap-16 lg:grid-cols-[1.3fr_1fr] lg:gap-20 items-center">
          {/* Left: Content */}
          <div className="max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-2 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-sm font-medium text-primary">
                142 experts online now
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in [animation-delay:100ms]">
              Post a Task.{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                Experts Compete.
              </span>
            </h1>

            <p className="mb-10 max-w-lg text-lg text-muted-foreground leading-relaxed animate-fade-in [animation-delay:200ms]">
              Describe what you need, set your budget, and get fixed-price quotes from verified experts in under 2 minutes. No browsing. No haggling.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row animate-fade-in [animation-delay:300ms]">
              <Link to="/post-request">
                <Button size="lg" className="gap-2 px-8 py-6 text-lg shadow-glow hover:shadow-glow-lg transition-shadow duration-500">
                  Post a Request
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="gap-2 px-8 py-6 text-lg border-border/60 hover:border-primary/40 hover:bg-primary/[0.06] transition-all duration-300">
                  <Sparkles className="h-5 w-5" />
                  Earn as Expert
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center gap-8 animate-fade-in [animation-delay:500ms]">
              {[
                { icon: <Users className="h-4 w-4" />, text: "500+ Verified Experts" },
                { icon: <Clock className="h-4 w-4" />, text: "~90s Avg Response" },
                { icon: <Shield className="h-4 w-4" />, text: "Escrow Protected" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground transition-colors duration-300 hover:text-foreground group">
                  <span className="text-primary/60 group-hover:text-primary transition-colors">{item.icon}</span>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Floating dashboard mockup */}
          <div className="relative hidden lg:block h-[560px]">
            {/* Main request card */}
            <div className="absolute top-0 left-4 w-[310px] rounded-2xl border border-border/60 bg-card/90 p-5 shadow-lg animate-fade-in-left [animation-delay:400ms] animate-float-slow backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Request</span>
                <span className="ml-auto relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
              </div>
              <p className="font-semibold text-foreground text-sm mb-2">Fix Minecraft server TPS drops</p>
              <p className="text-xs text-muted-foreground mb-3">Server running Paper 1.20.4, TPS drops to 12 during peak hours with 30+ players.</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] font-normal border-primary/20 text-primary/80">Gaming</Badge>
                <span className="font-bold text-foreground">€12</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 30min</span>
              </div>
              <div className="mt-4 h-1 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-primary to-primary/60 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              </div>
              <p className="mt-2 text-[10px] text-primary/70 font-medium">3 experts notified...</p>
            </div>

            {/* Quote response card */}
            <div className="absolute top-[200px] right-0 w-[270px] rounded-2xl border border-primary/20 bg-card/90 p-4 shadow-md animate-fade-in-right [animation-delay:700ms] animate-float backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary">JM</div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Jake Martinez</p>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-primary text-primary" />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-1">4.9</span>
                  </div>
                </div>
                <Badge className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/20" variant="outline">Expert</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">"I can optimize your Paper server config in ~15min. Java tuning is my specialty."</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">€10</span>
                <Button size="sm" className="h-7 text-xs gap-1 shadow-glow">
                  <CheckCircle className="h-3 w-3" /> Hire
                </Button>
              </div>
            </div>

            {/* Completed notification */}
            <div className="absolute bottom-[60px] left-0 w-[250px] rounded-2xl border border-border/40 bg-card/80 p-4 shadow-sm animate-fade-in [animation-delay:1000ms] animate-float-slow [animation-delay:2s] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Task Completed ✓</p>
                  <p className="text-[10px] text-muted-foreground">Payment released · €10.00</p>
                </div>
              </div>
            </div>

            {/* Stats mini card */}
            <div className="absolute bottom-[10px] right-[10px] rounded-xl border border-border/30 bg-card/70 p-3 backdrop-blur-xl animate-scale-in [animation-delay:1200ms]">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-primary/60" />
                    <p className="text-lg font-bold text-foreground">1,842</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground">Tasks today</p>
                </div>
                <div className="h-8 w-px bg-border/50" />
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">~90s</p>
                  <p className="text-[9px] text-muted-foreground">Avg response</p>
                </div>
              </div>
            </div>

            {/* Live activity ticker */}
            <div className="absolute top-[10px] right-0 w-[200px] rounded-xl border border-border/20 bg-card/60 p-3 backdrop-blur-xl animate-fade-in [animation-delay:500ms]">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Live Activity</p>
              <div className="space-y-2">
                {[
                  { title: "Discord bot setup", budget: "€8", time: "2s ago" },
                  { title: "Valorant coaching", budget: "€20", time: "15s ago" },
                  { title: "Logo design", budget: "€25", time: "1m ago" },
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]" style={{ opacity: 1 - i * 0.25 }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0 animate-pulse" />
                    <span className="text-muted-foreground truncate flex-1">{req.title}</span>
                    <span className="font-bold text-foreground shrink-0">{req.budget}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
