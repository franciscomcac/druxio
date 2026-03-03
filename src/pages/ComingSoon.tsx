import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, Rocket, ArrowRight, Zap, Shield, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/hooks/use-seo";

const ComingSoon = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useSeo({
    title: "Druxio — Coming Soon | Get Early Access",
    description: "Be the first to know when Druxio launches. Join the waitlist for early access to on-demand expert help.",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const { error: dbError } = await supabase
      .from("waitlist" as any)
      .insert({ email: email.trim().toLowerCase() } as any);

    if (dbError) {
      if (dbError.code === "23505") {
        setSubmitted(true); // already signed up
      } else {
        setError("Something went wrong. Please try again.");
      }
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg text-center space-y-8">
        {/* Logo / Brand */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Rocket className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tight">Druxio</span>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            Launching Soon
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
            On-Demand Expert Help,{" "}
            <span className="text-primary">Instantly</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Get matched with verified experts in minutes. From tech support to creative work — post a request and get it done.
          </p>
        </div>

        {/* Email form */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">You're on the list!</h3>
              <p className="text-sm text-muted-foreground">
                We'll notify you at <span className="font-medium text-foreground">{email}</span> when we launch.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>Join the waitlist for early access</span>
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  className="flex-1 h-11"
                  disabled={loading}
                />
                <Button type="submit" className="h-11 px-5 gap-2" disabled={loading}>
                  {loading ? "Joining…" : "Join"} <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <p className="text-[10px] text-muted-foreground">No spam. We'll only email you when we launch.</p>
            </>
          )}
        </div>

        {/* Features preview */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { icon: Zap, label: "Fast Matching", desc: "Under 5 min" },
            { icon: Shield, label: "Secure Payments", desc: "Escrow protected" },
            { icon: Globe, label: "Global Experts", desc: "24/7 available" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-lg border border-border bg-card/50 p-3 text-center space-y-1">
              <Icon className="h-4 w-4 mx-auto text-primary" />
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground pt-4">
          © {new Date().getFullYear()} Druxio. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;
