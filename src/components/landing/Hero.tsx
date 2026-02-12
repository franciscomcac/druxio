import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Clock, Shield } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-background pt-24 pb-36">
      {/* Soft organic blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 right-[10%] h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[100px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-[40%] -left-[10%] h-[400px] w-[400px] rounded-full bg-primary/[0.06] blur-[80px] animate-[pulse_10s_ease-in-out_infinite_1s]" />
        <div className="absolute -bottom-20 right-[30%] h-[300px] w-[300px] rounded-full bg-accent/50 blur-[60px] animate-[pulse_12s_ease-in-out_infinite_2s]" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Pill badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-5 py-2.5 backdrop-blur-md animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-sm text-muted-foreground">
              Expert quotes in under 2 minutes
            </span>
          </div>

          {/* Headline - softer, friendlier */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in [animation-delay:100ms]">
            Get Expert Help,{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              On Your Terms
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed animate-fade-in [animation-delay:200ms]">
            Describe what you need, set your budget, and let verified experts come to you with fixed-price offers — no searching, no haggling.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in [animation-delay:300ms]">
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

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-10 text-muted-foreground animate-fade-in [animation-delay:500ms]">
            <div className="flex items-center gap-2.5 transition-all duration-300 hover:text-foreground">
              <Users className="h-5 w-5 text-primary/70" />
              <span className="text-sm font-medium">500+ Experts Online</span>
            </div>
            <div className="flex items-center gap-2.5 transition-all duration-300 hover:text-foreground">
              <Clock className="h-5 w-5 text-primary/70" />
              <span className="text-sm font-medium">~90s Avg. Response</span>
            </div>
            <div className="flex items-center gap-2.5 transition-all duration-300 hover:text-foreground">
              <Shield className="h-5 w-5 text-primary/70" />
              <span className="text-sm font-medium">Escrow Protected</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
