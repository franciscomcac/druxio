import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const ref = useScrollReveal<HTMLElement>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section ref={ref} className="bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          {/* Stay Updated card */}
          <div className="rounded-lg border border-border bg-card p-8 flex flex-col reveal reveal-left">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-foreground">Stay Updated</h3>
            <p className="mb-8 text-muted-foreground text-sm leading-relaxed flex-1">
              Get notified about new categories, features, and platform updates.
            </p>

            {submitted ? (
              <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-4 text-primary border border-primary/20">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium text-sm">Thanks — a confirmation email has been sent.</span>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="newsletter-email" className="text-sm font-medium text-foreground">
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
                    className="flex-1 h-11 rounded-lg bg-background border-border"
                  />
                  <Button type="submit" className="gap-2 h-11 rounded-lg px-5">
                    Subscribe <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
              </div>
            )}
          </div>

          {/* Become an Expert card */}
          <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-card p-8 flex flex-col reveal reveal-right delay-150">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground glow-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-foreground">Become an Expert</h3>
            <p className="mb-6 text-muted-foreground text-sm leading-relaxed">
              Monetize your skills. Get pinged for jobs in your categories and earn up to{" "}
              <span className="font-bold text-primary">€500/week</span>.
            </p>
            <ul className="mb-8 space-y-3 flex-1">
              {["Real-time job notifications", "Set your own fixed prices", "90% earnings, weekly payouts"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground/90">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link to="/auth">
              <Button className="w-full gap-2 h-12 rounded-lg text-base font-semibold">
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
