import { useNavigate } from "react-router-dom";
import { Send, Bell, Handshake, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const steps = [
  { num: "01", icon: <Send className="h-6 w-6" />, title: "Describe Your Need", description: "Pick a category and tell us what you need done." },
  { num: "02", icon: <Bell className="h-6 w-6" />, title: "Experts Get Notified", description: "Online experts receive an instant notification." },
  { num: "03", icon: <Handshake className="h-6 w-6" />, title: "Compare & Hire", description: "Review competing offers and pick the best one." },
  { num: "04", icon: <CheckCircle className="h-6 w-6" />, title: "Done & Delivered", description: "Approve, rate, and payment is released." },
];

const HowItWorks = () => {
  const navigate = useNavigate();
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section id="how-it-works" ref={ref} className="bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mb-14 max-w-lg reveal">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">How It Works</p>
          <h2 className="mb-4 text-4xl font-bold text-foreground leading-tight">
            From request to done in four steps
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            No sign-up fees, no subscriptions. Post what you need and let experts come to you.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`group relative rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:bg-card/80 reveal delay-${i * 100 + 100}`}
            >
              <span className="text-4xl font-bold text-foreground font-mono block mb-4">
                {step.num}
              </span>
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {step.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 reveal delay-500">
          <Button onClick={() => navigate("/post-request")} className="gap-2 rounded-sm">
            Post a Task <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-2 rounded-sm border-border" onClick={() => navigate("/how-it-works")}>
            Learn more
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
