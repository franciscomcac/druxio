import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Zap, Clock } from "lucide-react";

const Pricing = () => {
  return (
    <section className="bg-background py-20" id="pricing">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">Simple & Transparent</h2>
          <p className="text-muted-foreground">No subscriptions. Experts set fixed prices. You only pay for results.</p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Zap className="h-7 w-7" />
              </div>
              <CardTitle>For Buyers</CardTitle>
              <CardDescription>Post requests for free</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {["Free to post any request", "Set your own budget (€5–50)", "See up to 3 expert quotes", "Only pay when you accept", "Escrow-protected payments"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary shadow-md">
            <CardHeader className="text-center">
              <Badge className="mx-auto mb-2 bg-primary text-primary-foreground">Most Popular</Badge>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Shield className="h-7 w-7" />
              </div>
              <CardTitle>Platform Fee</CardTitle>
              <CardDescription>
                <span className="text-4xl font-bold text-foreground">10%</span>
                <span className="block text-sm">per completed job</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {["Deducted from expert earnings", "Covers escrow & disputes", "Secure payment processing", "24h dispute resolution", "Auto-release after 48h"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Clock className="h-7 w-7" />
              </div>
              <CardTitle>For Experts</CardTitle>
              <CardDescription>Earn on your own terms</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {["Free to join & bid", "Set your own prices", "Real-time job notifications", "90% of each job you complete", "Weekly payouts via Stripe"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
