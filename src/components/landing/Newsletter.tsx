import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, DollarSign, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg animate-fade-in">
            <CardContent className="p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">Stay Updated</h3>
              <p className="mb-6 text-muted-foreground text-sm leading-relaxed">Get notified about new categories, features, and platform updates.</p>

              {submitted ? (
                <div className="flex items-center gap-3 rounded-xl bg-primary/[0.06] p-4 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium text-sm">Thanks! You're on the list.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="flex-1 bg-background/50" />
                  <Button type="submit" className="gap-2 hover-scale">Subscribe <ArrowRight className="h-4 w-4" /></Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.04] to-primary/[0.02] transition-all duration-500 hover:-translate-y-1 hover:shadow-lg animate-fade-in [animation-delay:100ms]">
            <CardContent className="p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">Become an Expert</h3>
              <p className="mb-6 text-muted-foreground text-sm leading-relaxed">
                Monetize your skills. Get pinged for jobs in your categories and earn up to <span className="font-semibold text-foreground">€500/week</span>.
              </p>
              <ul className="mb-6 space-y-2.5">
                {["Real-time job notifications", "Set your own fixed prices", "90% earnings, weekly payouts"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary/70" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className="w-full gap-2 hover-scale">Join as Expert <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
