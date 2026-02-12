import { useNavigate } from "react-router-dom";
import { Send, Bell, Handshake, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: <Send className="h-7 w-7" />, title: "Describe Your Need", description: "Pick a category and tell us what you need done." },
  { icon: <Bell className="h-7 w-7" />, title: "Experts Get Notified", description: "Online experts receive an instant notification." },
  { icon: <Handshake className="h-7 w-7" />, title: "Compare & Hire", description: "Review competing offers and pick the best one." },
  { icon: <CheckCircle className="h-7 w-7" />, title: "Done & Delivered", description: "Approve, rate, and payment is released." },
];

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <section id="how-it-works" className="relative bg-card/20 py-28 overflow-hidden">
      <div className="absolute top-0 left-[20%] h-[400px] w-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-16 max-w-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary animate-fade-in">How It Works</p>
          <h2 className="mb-4 text-4xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">
            From request to done in four steps
          </h2>
          <p className="text-muted-foreground text-lg animate-fade-in [animation-delay:200ms]">
            No sign-up fees, no subscriptions. Post what you need and let experts come to you.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative animate-slide-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="relative flex h-full flex-col rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:shadow-glow hover:-translate-y-2">
                <span className="mb-5 text-5xl font-bold text-primary/40 select-none drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]">
                  0{index + 1}
                </span>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary transition-transform duration-500 group-hover:scale-110">
                  {step.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center animate-fade-in [animation-delay:600ms]">
          <Button
            variant="outline"
            className="gap-2 border-primary/20 hover:bg-primary/[0.06] hover:border-primary/30"
            onClick={() => navigate("/how-it-works")}
          >
            Read the full breakdown <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
