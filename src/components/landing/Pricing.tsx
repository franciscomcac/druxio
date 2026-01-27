import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Video, Check, Zap } from "lucide-react";

const pricingOptions = [
  {
    title: "Chat Session",
    icon: <MessageSquare className="h-8 w-8" />,
    price: "$1.99",
    per: "per 10 min",
    description: "Real-time text chat with code sharing and screen grabs",
    features: [
      "Instant connection",
      "Code block sharing",
      "Image uploads",
      "Session notes saved",
    ],
    cta: "Start Chatting",
    popular: false,
  },
  {
    title: "Video Call",
    icon: <Video className="h-8 w-8" />,
    price: "$4.99",
    per: "per 15 min",
    description: "Face-to-face with screen sharing for complex issues",
    features: [
      "HD video call",
      "Screen sharing",
      "Recording option",
      "AI summary included",
    ],
    cta: "Start Video Call",
    popular: true,
  },
];

const walletBonuses = [
  { amount: "$5", bonus: null },
  { amount: "$10", bonus: null },
  { amount: "$50", bonus: "+10% bonus" },
  { amount: "$100", bonus: "+15% bonus" },
];

const Pricing = () => {
  return (
    <section className="bg-background py-20" id="pricing">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground">
            Pay only for the time you use. No subscriptions, no hidden fees.
          </p>
        </div>

        {/* Session pricing */}
        <div className="mx-auto mb-16 grid max-w-3xl gap-6 md:grid-cols-2">
          {pricingOptions.map((option) => (
            <Card
              key={option.title}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                option.popular ? "border-primary shadow-md" : "border-border"
              }`}
            >
              {option.popular && (
                <div className="absolute right-4 top-4">
                  <Badge className="gap-1 bg-primary text-primary-foreground">
                    <Zap className="h-3 w-3" /> Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {option.icon}
                </div>
                <CardTitle className="text-xl">{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">{option.price}</span>
                  <span className="text-muted-foreground"> {option.per}</span>
                </div>
                <ul className="mb-6 space-y-3">
                  {option.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={option.popular ? "default" : "outline"}>
                  {option.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Wallet top-up */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
          <h3 className="mb-2 text-xl font-semibold text-foreground">
            Top Up Your Wallet
          </h3>
          <p className="mb-6 text-muted-foreground">
            Pre-load credits for faster checkout and exclusive bonuses
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {walletBonuses.map((wallet) => (
              <Button
                key={wallet.amount}
                variant="outline"
                className="relative gap-2"
              >
                {wallet.amount}
                {wallet.bonus && (
                  <Badge variant="secondary" className="text-xs">
                    {wallet.bonus}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Dynamic pricing: Peak hours (+20%) • Off-peak (-10%)
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
