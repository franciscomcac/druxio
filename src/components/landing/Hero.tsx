import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Users, Clock } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-accent/30 pt-20 pb-32">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>
      
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Expert dev help in 60 seconds
            </span>
          </div>
          
          {/* Main headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Get Expert Dev Help{" "}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Connect with coding mentors in real-time. From React bugs to Java algorithms, 
            get personalized help from verified experts when you need it most.
          </p>
          
          {/* CTA buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 px-8 py-6 text-lg">
              Find a Mentor Now
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="gap-2 px-8 py-6 text-lg">
              Become a Mentor
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">500+ Active Mentors</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">2 min Avg. Response</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">10k+ Sessions Completed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
