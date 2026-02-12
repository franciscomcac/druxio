import { Send, Bell, Handshake, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: <Send className="h-7 w-7" />,
    title: "Describe Your Need",
    description: "Tell us what you need help with, set a budget (€5–50), and pick a deadline.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: <Bell className="h-7 w-7" />,
    title: "Experts Are Notified",
    description: "Online experts in your category receive an instant ping — no browsing required.",
    accent: "from-primary/15 to-primary/5",
  },
  {
    icon: <Handshake className="h-7 w-7" />,
    title: "Choose Your Expert",
    description: "Review up to 3 fixed-price quotes and hire the one that fits best.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: <CheckCircle className="h-7 w-7" />,
    title: "Done & Delivered",
    description: "Approve the result, leave a rating, and payment is released. Simple.",
    accent: "from-primary/15 to-primary/5",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative bg-card/20 py-28 overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-[20%] h-[400px] w-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-20 max-w-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary animate-fade-in">How It Works</p>
          <h2 className="mb-4 text-4xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">
            From request to done in four steps
          </h2>
          <p className="text-muted-foreground text-lg animate-fade-in [animation-delay:200ms]">
            No sign-up fees, no subscriptions. Post what you need and let experts come to you.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative animate-slide-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="relative flex h-full flex-col rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:shadow-glow hover:-translate-y-2">
                {/* Step number */}
                <span className="mb-5 text-5xl font-bold text-primary/40 select-none drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]">
                  0{index + 1}
                </span>

                {/* Icon */}
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-primary transition-transform duration-500 group-hover:scale-110`}>
                  {step.icon}
                </div>

                <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
