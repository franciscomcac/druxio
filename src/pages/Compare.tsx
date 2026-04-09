import { useSEO } from "@/hooks/use-seo";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus, Zap, Shield, Clock, DollarSign } from "lucide-react";

const platforms = [
  { name: "Druxio", highlight: true },
  { name: "Fiverr", highlight: false },
  { name: "Upwork", highlight: false },
  { name: "Freelancer", highlight: false },
];

const features = [
  {
    category: "Pricing",
    icon: DollarSign,
    items: [
      { feature: "Platform fee", druxio: "5%", fiverr: "20%", upwork: "10–20%", freelancer: "10–13%" },
      { feature: "Free to post tasks", druxio: true, fiverr: true, upwork: true, freelancer: true },
      { feature: "No subscription required", druxio: true, fiverr: true, upwork: false, freelancer: false },
      { feature: "Hidden fees", druxio: false, fiverr: true, upwork: true, freelancer: true },
      { feature: "PayPal checkout", druxio: true, fiverr: false, upwork: false, freelancer: true },
    ],
  },
  {
    category: "Speed & Matching",
    icon: Clock,
    items: [
      { feature: "Average first quote", druxio: "< 2 min", fiverr: "N/A (browse)", upwork: "Hours–days", freelancer: "Hours" },
      { feature: "AI-powered matching", druxio: true, fiverr: false, upwork: true, freelancer: false },
      { feature: "Real-time expert notifications", druxio: true, fiverr: false, upwork: false, freelancer: false },
      { feature: "Quote-based system", druxio: true, fiverr: false, upwork: true, freelancer: true },
      { feature: "Max quotes per request", druxio: "3", fiverr: "N/A", upwork: "50+", freelancer: "Unlimited" },
    ],
  },
  {
    category: "Trust & Safety",
    icon: Shield,
    items: [
      { feature: "Escrow protection", druxio: true, fiverr: true, upwork: true, freelancer: true },
      { feature: "Auto-release window", druxio: "48h", fiverr: "72h", upwork: "14 days", freelancer: "14 days" },
      { feature: "Dispute resolution", druxio: "24h", fiverr: "48–72h", upwork: "5–10 days", freelancer: "7+ days" },
      { feature: "AI content moderation", druxio: true, fiverr: true, upwork: false, freelancer: false },
      { feature: "Expert verification badges", druxio: true, fiverr: false, upwork: true, freelancer: false },
    ],
  },
  {
    category: "Features",
    icon: Zap,
    items: [
      { feature: "Built-in real-time chat", druxio: true, fiverr: true, upwork: true, freelancer: true },
      { feature: "File sharing in chat", druxio: true, fiverr: true, upwork: true, freelancer: true },
      { feature: "Expert portfolio", druxio: true, fiverr: true, upwork: true, freelancer: true },
      { feature: "Micro-task focus (€5–€50)", druxio: true, fiverr: false, upwork: false, freelancer: false },
      { feature: "AI request refinement", druxio: true, fiverr: false, upwork: false, freelancer: false },
      { feature: "Dark mode", druxio: true, fiverr: false, upwork: false, freelancer: false },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-emerald-500 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-red-400 mx-auto" />
    );
  }
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

const Compare = () => {
  useSEO({
    title: "Druxio vs Fiverr vs Upwork — Compare Fees",
    description:
      "Compare Druxio's 5% fee with Fiverr (20%) and Upwork (10-20%). Side-by-side comparison of pricing, speed, trust & safety, and features across top freelance platforms.",
    canonical: "/compare",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Druxio vs Fiverr vs Upwork — Freelance Platform Comparison",
        description:
          "Side-by-side comparison of Druxio, Fiverr, Upwork, and Freelancer across pricing, speed, trust, and features. Druxio charges only 5% vs competitors' 10-20%.",
        url: "https://druxio.net/compare",
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["h1", "h2", ".comparison-summary"],
        },
        mainEntity: {
          "@type": "Table",
          about: "Freelance marketplace fee comparison",
        },
      },
    ],
  });

  return (
    <main className="min-h-screen py-16">
      <div className="container mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4 text-xs">
            Platform Comparison
          </Badge>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">
            Druxio vs The Competition
          </h1>
          <p className="comparison-summary mx-auto max-w-2xl text-lg text-muted-foreground">
            See why Druxio's <strong className="text-primary">5% fee</strong> saves freelancers up to{" "}
            <strong className="text-primary">75% in platform costs</strong> compared to Fiverr, Upwork, and
            Freelancer — with faster matching and stronger buyer protection.
          </p>
        </div>

        {/* Quick stats */}
        <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Platform fee", value: "5%", sub: "vs 20% on Fiverr" },
            { label: "Avg first quote", value: "< 2 min", sub: "Real-time notifications" },
            { label: "Expert earnings", value: "95%", sub: "Industry-leading payout" },
            { label: "Dispute resolution", value: "24h", sub: "vs 5–10 days on Upwork" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card/50 p-5 text-center"
            >
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-sm font-medium text-foreground">{s.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Comparison tables */}
        <div className="space-y-10">
          {features.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.category}>
                <div className="mb-4 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">{section.category}</h2>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature</th>
                        {platforms.map((p) => (
                          <th
                            key={p.name}
                            className={`px-4 py-3 text-center font-semibold ${
                              p.highlight ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {p.name}
                            {p.highlight && (
                              <Zap className="ml-1 inline h-3.5 w-3.5 text-primary" />
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, i) => (
                        <tr
                          key={item.feature}
                          className={i % 2 === 0 ? "bg-card/30" : "bg-card/10"}
                        >
                          <td className="px-4 py-3 text-foreground">{item.feature}</td>
                          <td className="px-4 py-3 text-center">
                            <CellValue value={item.druxio} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <CellValue value={item.fiverr} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <CellValue value={item.upwork} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <CellValue value={item.freelancer} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-foreground">
            Stop overpaying for freelance help
          </h2>
          <p className="mb-6 text-muted-foreground">
            Join Druxio and keep 95% of your earnings — or post your first task for free.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Get Started Free
            </a>
            <a
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              See How It Works
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Compare;
