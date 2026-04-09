import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useThrottle } from "@/hooks/use-throttle";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const ref = useScrollReveal<HTMLElement>();
  const throttle = useThrottle(5000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && throttle()) setSubmitted(true);
  };

  return (
    <section ref={ref} className="relative bg-background py-12 md:py-24 overflow-hidden">
      {/* Diagonal accent shape */}
      <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[100px] rotate-12 pointer-events-none" />

      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-5xl gap-4 md:gap-6 lg:grid-cols-2">
          {/* Want in? card */}
          <div className="rounded-lg border border-border bg-card p-5 md:p-8 flex flex-col reveal reveal-left">
            <div className="mb-4 md:mb-6 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <h3 className="mb-2 text-xl md:text-2xl font-bold text-foreground">Want in?</h3>
            <p className="mb-5 md:mb-8 text-muted-foreground text-xs md:text-sm leading-relaxed flex-1">
              Get notified about new categories, features, and platform updates. No spam.
            </p>

            {submitted ? (
              <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-3 md:p-4 text-primary border border-primary/20">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                <span className="font-medium text-xs md:text-sm">Thanks — a confirmation email has been sent.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="newsletter-email" className="text-xs md:text-sm font-medium text-foreground">
                  Your email
                </label>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    id="newsletter-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                    className="flex-1 h-10 md:h-11 rounded-lg bg-background border-border text-sm"
                  />
                  <Button type="submit" className="gap-2 h-10 md:h-11 rounded-lg px-4 md:px-5 text-sm">
                    Subscribe <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
                <p className="text-[10px] md:text-xs text-muted-foreground">Unsubscribe anytime.</p>
              </div>
            )}
          </div>

          {/* Got skills? Get paid. card */}
          <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-card p-5 md:p-8 flex flex-col reveal reveal-right delay-150">
            <div className="mb-4 md:mb-6 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground glow-pulse">
              <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <h3 className="mb-2 text-xl md:text-2xl font-bold text-foreground">Got skills? Get paid.</h3>
            <p className="mb-4 md:mb-6 text-muted-foreground text-xs md:text-sm leading-relaxed">
              Get pinged for jobs in your niche and earn up to{" "}
              <span className="font-bold text-primary">€500/week</span>.
            </p>
            <ul className="mb-5 md:mb-8 space-y-2 md:space-y-3 flex-1">
              {["Real-time notifications", "Set your own prices", "95% earnings, weekly payouts"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs md:text-sm text-foreground/90">
                  <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link to="/auth" onClick={() => localStorage.setItem("auth_redirect", "/dashboard?become_expert=1")}>
              <Button className="w-full gap-2 h-10 md:h-12 rounded-lg text-sm md:text-base font-semibold">
                Join as Expert <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
