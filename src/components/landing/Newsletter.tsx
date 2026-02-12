import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, DollarSign, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="relative bg-card/10 py-28 overflow-hidden">
      <div className="absolute bottom-0 left-[30%] h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[130px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <Card className="border-border/30 bg-card/50 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-glow animate-fade-in-left">
            <CardContent className="p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">Stay Updated</h3>
              <p className="mb-6 text-muted-foreground text-sm leading-relaxed">Get notified about new categories, features, and platform updates.</p>

              {submitted ? (
                <div className="flex items-center gap-3 rounded-xl bg-primary/[0.08] p-4 text-primary border border-primary/20">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium text-sm">Thanks! You're on the list.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="flex-1 bg-background/60 border-border/40" />
                  <Button type="submit" className="gap-2 shadow-glow">Subscribe <ArrowRight className="h-4 w-4" /></Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-card/60 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-glow-lg animate-fade-in-right">
            <CardContent className="p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">Become an Expert</h3>
              <p className="mb-6 text-muted-foreground text-sm leading-relaxed">
                Monetize your skills. Get pinged for jobs in your categories and earn up to <span className="font-bold text-primary">€500/week</span>.
              </p>
              <ul className="mb-6 space-y-2.5">
                {["Real-time job notifications", "Set your own fixed prices", "90% earnings, weekly payouts"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className="w-full gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500">Join as Expert <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
