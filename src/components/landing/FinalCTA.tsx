import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useThrottle } from "@/hooks/use-throttle";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { ArrowRight, CheckCircle, Sparkles, Search } from "lucide-react";

const FinalCTA = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const ref = useScrollReveal<HTMLElement>();
  const throttle = useThrottle(5000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && throttle()) setSubmitted(true);
  };

  return (
    <section ref={ref} className="relative overflow-hidden bg-background py-16 md:py-28">
      {/* Deep atmospheric glows for the closing moment */}
      <div className="glow-blob top-[-20%] left-[20%] h-[500px] w-[500px] bg-primary/[0.12]" />
      <div className="glow-blob bottom-[-20%] right-[10%] h-[420px] w-[420px] bg-primary/[0.08]" />
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.02)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        {/* Headline */}
        <div className="mx-auto max-w-2xl text-center reveal">
          <h2 className="text-3xl md:text-6xl font-bold text-foreground leading-[1.05] mb-4">
            Two ways in.{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              Pick yours.
            </span>
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-lg mx-auto">
            Need something done, or got skills to sell? Either way you're two minutes from your first match.
          </p>
        </div>

        {/* Dual path cards */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:gap-5 md:grid-cols-2">
          {/* Hire */}
          <div className="glass-strong gradient-border rounded-2xl p-6 md:p-8 flex flex-col reveal reveal-left">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-xl md:text-2xl font-bold text-foreground">I need something done</h3>
            <p className="mb-6 text-sm text-muted-foreground leading-relaxed flex-1">
              Describe the task, get competing quotes from verified experts in seconds. Pay only when you're happy.
            </p>
            <Link to="/post-request">
              <Button size="lg" className="w-full gap-2 rounded-sm font-semibold">
                Post a task <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Earn */}
          <div className="glass-strong rounded-2xl p-6 md:p-8 flex flex-col reveal reveal-right delay-150 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/[0.15] blur-[60px] pointer-events-none" />
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground glow-pulse">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-xl md:text-2xl font-bold text-foreground">
              I've got skills to sell
            </h3>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              Get pinged for jobs in your niche and earn up to{" "}
              <span className="font-bold text-primary">€500/week</span> — keeping 95%.
            </p>
            <ul className="mb-6 space-y-2 flex-1">
              {["Real-time notifications", "Set your own prices", "Weekly payouts, only 5% fee"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link to="/auth" onClick={() => localStorage.setItem("auth_redirect", "/dashboard?become_expert=1")}>
              <Button size="lg" className="w-full gap-2 rounded-sm font-semibold">
                Join as expert <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Newsletter — low-key strip beneath */}
        <div className="mx-auto mt-6 max-w-4xl glass rounded-xl px-5 py-4 md:px-7 md:py-5 flex flex-col sm:flex-row sm:items-center gap-4 reveal delay-300">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Not ready yet?</p>
            <p className="text-xs text-muted-foreground">Get new categories, features and updates. No spam.</p>
          </div>
          {submitted ? (
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <CheckCircle className="h-4 w-4 shrink-0" /> Thanks — confirmation sent.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
              <label htmlFor="cta-email" className="sr-only">Your email</label>
              <Input
                id="cta-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="h-10 rounded-sm bg-background/60 border-border text-sm sm:w-56"
              />
              <Button type="submit" className="h-10 gap-1.5 rounded-sm px-4 text-sm shrink-0">
                Notify me
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
