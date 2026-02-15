import { useNavigate } from "react-router-dom";
import { Send, Bell, Handshake, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { num: "01", icon: <Send className="h-5 w-5" />, title: "Post your task", description: "Pick a category and describe what you need done. Set your budget." },
  { num: "02", icon: <Bell className="h-5 w-5" />, title: "Experts get notified", description: "Matching experts are pinged instantly. They send fixed-price quotes." },
  { num: "03", icon: <Handshake className="h-5 w-5" />, title: "Compare & hire", description: "Review competing offers, check ratings, and pick the best expert." },
  { num: "04", icon: <CheckCircle className="h-5 w-5" />, title: "Done & paid", description: "Approve the work. Payment releases from escrow. Both parties rate." },
];

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <section id="how-it-works" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">How It Works</p>
          <h2 className="text-3xl font-bold text-foreground">From request to done in four steps</h2>
        </div>

        <div className="grid gap-px md:grid-cols-4 border border-border/40 rounded-sm overflow-hidden bg-border/40 mb-10">
          {steps.map((step, i) => (
            <div key={i} className="bg-card/80 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary/30 font-mono">{step.num}</span>
                <div className="h-8 w-8 flex items-center justify-center rounded-sm bg-primary/10 text-primary">
                  {step.icon}
                </div>
              </div>
              <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => navigate("/post-request")} className="gap-2 rounded-sm">
            Post a Task <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-2 rounded-sm border-border/50" onClick={() => navigate("/how-it-works")}>
            Learn more
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
