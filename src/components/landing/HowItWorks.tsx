import { useNavigate } from "react-router-dom";
import { Send, Bell, Handshake, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const steps = [
  { num: "01", icon: <Send className="h-6 w-6" />, title: "Say what you need", description: "Pick a category and describe your task in a few words. Takes 30 seconds." },
  { num: "02", icon: <Bell className="h-6 w-6" />, title: "Experts jump in", description: "Online pros get notified instantly and send you competing quotes." },
  { num: "03", icon: <Handshake className="h-6 w-6" />, title: "Pick your favorite", description: "Compare offers, check ratings, and hire the one you like best." },
  { num: "04", icon: <CheckCircle className="h-6 w-6" />, title: "Done. Pay. Rate.", description: "Approve the work, payment releases automatically, leave a review." },
];

const HowItWorks = () => {
  const navigate = useNavigate();
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section id="how-it-works" ref={ref} className="bg-background py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 md:mb-14 max-w-lg reveal">
          <p className="mb-2 md:mb-3 text-xs md:text-sm font-semibold uppercase tracking-widest text-primary">Dead simple</p>
          <h2 className="mb-3 md:mb-4 text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Four steps. That's it.
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg leading-relaxed">
            No sign-up fees, no subscriptions. Post what you need and let experts come to you.
          </p>
        </div>

        {/* Asymmetric layout: featured first step + 3 stacked */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-2 mb-8 md:mb-12">
          {/* Featured step 01 */}
          <div className="group relative rounded-lg border border-primary/20 bg-card p-6 md:p-10 transition-all duration-300 hover:border-primary/40 reveal delay-100 lg:row-span-3 flex flex-col justify-between">
            <div>
              <span className="absolute top-4 right-4 text-[6rem] md:text-[8rem] font-bold text-foreground/[0.03] font-mono leading-none select-none pointer-events-none">
                01
              </span>
              <div className="mb-4 md:mb-6 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {steps[0].icon}
              </div>
              <h3 className="mb-2 md:mb-3 text-lg md:text-2xl font-semibold text-foreground">{steps[0].title}</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm">{steps[0].description}</p>
            </div>
            <div className="mt-6">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => navigate("/post-request")}
              >
                Try it now <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Steps 02-04 stacked */}
          {steps.slice(1).map((step, i) => (
            <div
              key={step.num}
              className={`group relative rounded-lg border border-border bg-card p-4 md:p-6 transition-all duration-300 hover:border-primary/40 hover:bg-card/80 reveal delay-${(i + 2) * 100}`}
            >
              <span className="absolute top-3 right-4 text-[3rem] md:text-[4rem] font-bold text-foreground/[0.03] font-mono leading-none select-none pointer-events-none">
                {step.num}
              </span>
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  {step.icon}
                </div>
                <div>
                  <h3 className="mb-1 text-sm md:text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 reveal delay-500">
          <Button onClick={() => navigate("/post-request")} className="gap-2 rounded-sm text-sm">
            Post a Task <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-2 rounded-sm border-border text-sm" onClick={() => navigate("/how-it-works")}>
            Learn more
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
