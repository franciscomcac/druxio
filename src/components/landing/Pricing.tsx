import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Zap, Clock } from "lucide-react";

const Pricing = () => {
  return (
    <section className="relative bg-background py-28 overflow-hidden" id="pricing">
      <div className="absolute top-0 right-[20%] h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[130px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary animate-fade-in">Pricing</p>
          <h2 className="mb-4 text-4xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">Simple & Transparent</h2>
          <p className="text-muted-foreground text-lg animate-fade-in [animation-delay:200ms]">No subscriptions. Experts set fixed prices. You only pay for results.</p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {[
            {
              icon: <Zap className="h-7 w-7" />,
              title: "For Buyers",
              desc: "Post requests for free",
              features: ["Free to post any request", "Set your own budget (€5–50)", "See up to 3 expert quotes", "Only pay when you accept", "Escrow-protected payments"],
              highlight: false,
            },
            {
              icon: <Shield className="h-7 w-7" />,
              title: "Platform Fee",
              desc: null,
              features: ["Deducted from expert earnings", "Covers escrow & disputes", "Secure payment processing", "24h dispute resolution", "Auto-release after 48h"],
              highlight: true,
            },
            {
              icon: <Clock className="h-7 w-7" />,
              title: "For Experts",
              desc: "Earn on your own terms",
              features: ["Free to join & bid", "Set your own prices", "Real-time job notifications", "95% of each job you complete", "Weekly payouts via Stripe"],
              highlight: false,
            },
          ].map((plan, i) => (
            <Card
              key={plan.title}
              className={`transition-all duration-500 hover:-translate-y-2 animate-slide-up ${plan.highlight ? "border-primary/30 shadow-glow bg-card/80" : "border-border/30 bg-card/40"}`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <CardHeader className="text-center">
                {plan.highlight && <Badge className="mx-auto mb-3 bg-primary text-primary-foreground shadow-glow">Most Popular</Badge>}
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${plan.highlight ? "bg-primary text-primary-foreground shadow-glow" : "bg-primary/[0.08] text-primary"} transition-transform duration-500 hover:scale-110`}>
                  {plan.icon}
                </div>
                <CardTitle className="text-foreground">{plan.title}</CardTitle>
                <CardDescription>
                  {plan.highlight ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">5%</span>
                      <span className="block text-sm mt-1 text-muted-foreground">per completed job</span>
                    </>
                  ) : <span className="text-muted-foreground">{plan.desc}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
