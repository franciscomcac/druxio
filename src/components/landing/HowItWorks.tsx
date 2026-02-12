import { Send, Bell, Handshake, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: <Send className="h-7 w-7" />,
    title: "Describe Your Need",
    description: "Tell us what you need help with, set a budget (€5–50), and pick a deadline.",
  },
  {
    icon: <Bell className="h-7 w-7" />,
    title: "Experts Are Notified",
    description: "Online experts in your category receive an instant ping — no browsing required.",
  },
  {
    icon: <Handshake className="h-7 w-7" />,
    title: "Choose Your Expert",
    description: "Review up to 3 fixed-price quotes and hire the one that fits best.",
  },
  {
    icon: <CheckCircle className="h-7 w-7" />,
    title: "Done & Delivered",
    description: "Approve the result, leave a rating, and payment is released. Simple.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-card/30 py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground animate-fade-in">
            How It Works
          </h2>
          <p className="text-muted-foreground animate-fade-in [animation-delay:100ms]">
            From request to done in four simple steps
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-14 hidden h-px w-full bg-gradient-to-r from-border to-transparent lg:block" />
              )}

              <div className="relative flex flex-col items-center text-center">
                {/* Step number */}
                <span className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary/60">
                  Step {index + 1}
                </span>

                {/* Icon */}
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary transition-all duration-500 group-hover:bg-primary/[0.12] group-hover:scale-105">
                  {step.icon}
                </div>

                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
