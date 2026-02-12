import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Clock, Shield, Zap, Star, Send, CheckCircle } from "lucide-react";

const floatingRequests = [
  { title: "Fix Minecraft server lag", budget: "€12", time: "15min", status: "3 quotes" },
  { title: "Discord bot setup", budget: "€8", time: "20min", status: "Expert hired" },
  { title: "Logo design for startup", budget: "€25", time: "45min", status: "2 quotes" },
];

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-24 md:pt-20 md:pb-32">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 right-[15%] h-[600px] w-[600px] rounded-full bg-primary/[0.03] blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-[60%] -left-[15%] h-[500px] w-[500px] rounded-full bg-primary/[0.05] blur-[100px] animate-[pulse_10s_ease-in-out_infinite_1s]" />
        <div className="absolute -bottom-32 right-[40%] h-[400px] w-[400px] rounded-full bg-accent/40 blur-[80px] animate-[pulse_12s_ease-in-out_infinite_2s]" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        {/* Asymmetric grid layout */}
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16 items-center">
          {/* Left: Text content - left aligned */}
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 backdrop-blur-md animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="text-sm text-muted-foreground">
                Expert quotes in under 2 minutes
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in [animation-delay:100ms]">
              Get Expert Help,{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                On Your Terms
              </span>
            </h1>

            <p className="mb-8 max-w-lg text-lg text-muted-foreground leading-relaxed animate-fade-in [animation-delay:200ms]">
              Describe what you need, set your budget, and let verified experts come to you with fixed-price offers — no searching, no haggling.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row animate-fade-in [animation-delay:300ms]">
              <Link to="/post-request">
                <Button size="lg" className="gap-2 px-8 py-6 text-lg hover-scale">
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="gap-2 px-8 py-6 text-lg hover-scale">
                  Join as Expert
                </Button>
              </Link>
            </div>

            {/* Trust row */}
            <div className="mt-10 flex flex-wrap items-center gap-6 text-muted-foreground animate-fade-in [animation-delay:500ms]">
              <div className="flex items-center gap-2 transition-all duration-300 hover:text-foreground">
                <Users className="h-4 w-4 text-primary/70" />
                <span className="text-sm">500+ Experts</span>
              </div>
              <div className="flex items-center gap-2 transition-all duration-300 hover:text-foreground">
                <Clock className="h-4 w-4 text-primary/70" />
                <span className="text-sm">~90s Response</span>
              </div>
              <div className="flex items-center gap-2 transition-all duration-300 hover:text-foreground">
                <Shield className="h-4 w-4 text-primary/70" />
                <span className="text-sm">Escrow Protected</span>
              </div>
            </div>
          </div>

          {/* Right: Floating visual cards - staggered, asymmetric */}
          <div className="relative hidden lg:block h-[520px]">
            {/* Main floating request card */}
            <div className="absolute top-4 left-8 w-[300px] rounded-2xl border border-border/50 bg-card/80 p-5 backdrop-blur-md shadow-lg animate-fade-in [animation-delay:400ms] hover:-translate-y-1 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">New Request</span>
                <span className="ml-auto relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary/60" />
                </span>
              </div>
              <p className="font-medium text-foreground text-sm mb-2">Fix Minecraft server TPS drops</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] font-normal">Gaming</Badge>
                <span className="font-semibold text-foreground">€12</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 30min</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="h-7 text-xs gap-1 flex-1">
                  <Zap className="h-3 w-3" /> Send Quote
                </Button>
              </div>
            </div>

            {/* Quote response card - offset right */}
            <div className="absolute top-[180px] right-0 w-[260px] rounded-2xl border border-primary/20 bg-card/80 p-4 backdrop-blur-md shadow-md animate-fade-in [animation-delay:600ms] hover:-translate-y-1 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">JM</div>
                <div>
                  <p className="text-xs font-medium text-foreground">Jake M.</p>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-2.5 w-2.5 fill-primary/70 text-primary/70" />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-1">4.9</span>
                  </div>
                </div>
                <Badge className="ml-auto text-[10px]">Expert</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">"I can fix this in ~15min. Java performance is my specialty."</p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">€10</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> 15min</span>
              </div>
            </div>

            {/* Completed notification - bottom left */}
            <div className="absolute bottom-[40px] left-0 w-[240px] rounded-2xl border border-border/40 bg-card/70 p-4 backdrop-blur-md shadow-sm animate-fade-in [animation-delay:800ms] hover:-translate-y-1 transition-transform duration-500">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Job Completed!</p>
                  <p className="text-[10px] text-muted-foreground">Payment released · €10</p>
                </div>
              </div>
            </div>

            {/* Live activity ticker - top right */}
            <div className="absolute top-0 right-4 w-[200px] rounded-xl border border-border/30 bg-card/60 p-3 backdrop-blur-md animate-fade-in [animation-delay:500ms]">
              <div className="space-y-2">
                {floatingRequests.map((req, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]" style={{ opacity: 1 - i * 0.2 }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                    <span className="text-muted-foreground truncate flex-1">{req.title}</span>
                    <span className="font-semibold text-foreground shrink-0">{req.budget}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats mini card - bottom right */}
            <div className="absolute bottom-[20px] right-[20px] rounded-xl border border-border/30 bg-card/60 p-3 backdrop-blur-md animate-fade-in [animation-delay:900ms]">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">142</p>
                  <p className="text-[9px] text-muted-foreground">Online now</p>
                </div>
                <div className="h-8 w-px bg-border/50" />
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">~90s</p>
                  <p className="text-[9px] text-muted-foreground">Avg response</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
