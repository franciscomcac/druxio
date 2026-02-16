import { useEffect, useRef, useState } from "react";
import { Send, Bell, MessageSquare, Shield, Star, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: <Send className="h-7 w-7" />,
    title: "Pick a Category & Describe Your Need",
    description:
      "Head to \"Post a Request\" and choose a broad category like Gaming, Tech, or Creative. Then pick a specialty — for example Valorant, Discord Bots, or Video Editing. Finally, write a clear title and description of exactly what you need done.",
    details: [
      "Choose from 8+ broad categories",
      "Narrow down to a specific specialty",
      "Write a title and detailed description",
      "It's completely free to post",
    ],
  },
  {
    icon: <Bell className="h-7 w-7" />,
    title: "Experts Get Notified Instantly",
    description:
      "The moment you post, every online expert subscribed to your category gets a real-time notification. There's no browsing or searching — experts come to you.",
    details: [
      "Real-time push notifications to matching experts",
      "Only online, subscribed experts are pinged",
      "3-minute response window for urgency",
      "Up to 3 experts can send you a quote",
    ],
  },
  {
    icon: <MessageSquare className="h-7 w-7" />,
    title: "Compare Quotes & Pick Your Expert",
    description:
      "Incoming quotes appear live on your screen — each one shows the expert's price, estimated delivery time, a personal message, their rating, and total completed jobs.",
    details: [
      "See price, delivery time & expert message",
      "Check ratings and completed job history",
      "Quotes arrive in real time — no refreshing",
      "One click to hire your chosen expert",
    ],
  },
  {
    icon: <Shield className="h-7 w-7" />,
    title: "Escrow Payment & Chat",
    description:
      "Once you hire, your payment is held safely in escrow — the expert doesn't get paid until you're satisfied. A private chat opens where you can share details, files, and track progress.",
    details: [
      "Payment held in escrow until you approve",
      "Private chat with your expert",
      "Share files and additional details",
      "Full control — release payment when satisfied",
    ],
  },
  {
    icon: <Star className="h-7 w-7" />,
    title: "Approve, Rate & Done",
    description:
      "When the work is delivered, review the result. If you're happy, approve it and the payment is released to the expert. Leave a rating and review to help future buyers.",
    details: [
      "Review the delivered work",
      "Approve to release payment",
      "Leave a rating and written review",
      "10% platform fee — no hidden costs",
    ],
  },
];

function useScrollReveal() {
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set());
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute("data-index"));
          if (entry.isIntersecting) {
            setVisibleSet((prev) => new Set(prev).add(idx));
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return { refs, visibleSet };
}

const HowItWorks = () => {
  const { refs, visibleSet } = useScrollReveal();

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Fixed gradient background that doesn't scroll */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[10%] left-[15%] h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[150px]" />
        <div className="absolute top-[40%] right-[10%] h-[400px] w-[400px] rounded-full bg-primary/[0.06] blur-[130px]" />
        <div className="absolute bottom-[10%] left-[30%] h-[350px] w-[350px] rounded-full bg-primary/[0.03] blur-[120px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 pt-16 pb-20 relative z-10">
        {/* Vertical connector line */}
        <div className="hidden md:block absolute left-1/2 top-[80px] bottom-32 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border to-transparent pointer-events-none" />

        {/* Steps — alternating left/right */}
        <div className="relative">
          {steps.map((step, index) => {
            const isLeft = index % 2 === 0;
            const isVisible = visibleSet.has(index);

            return (
              <div
                key={index}
                ref={(el) => { refs.current[index] = el; }}
                data-index={index}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-0 transition-all duration-700 ease-out ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : `opacity-0 translate-y-12 ${isLeft ? "md:-translate-x-8" : "md:translate-x-8"}`
                }`}
                style={{ transitionDelay: "100ms", marginTop: index === 0 ? 0 : "-6rem" }}
              >
                {/* Left spacer or content */}
                <div className={`w-full md:w-[45%] ${isLeft ? "" : "md:order-2"}`}>
                  <div className={`rounded-2xl border border-border bg-card/70 backdrop-blur-md p-6 md:p-8 transition-all duration-500 hover:border-primary/30 hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.15)] group ${
                    isLeft ? "md:mr-8" : "md:ml-8"
                  }`}>
                    {/* Step number + icon row */}
                    <div className="flex items-center gap-4 mb-5">
                      <span className="text-4xl font-bold text-primary/50 select-none font-mono">
                        0{index + 1}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-transform duration-500 group-hover:scale-110 group-hover:bg-primary/[0.12]">
                        {step.icon}
                      </div>
                    </div>

                    <h3 className="mb-3 text-xl font-semibold text-foreground">{step.title}</h3>
                    <p className="text-foreground/70 leading-relaxed mb-5 text-sm">{step.description}</p>

                    <ul className="grid grid-cols-1 gap-2">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Center dot on the timeline */}
                <div className="hidden md:flex w-[10%] justify-center relative">
                  <div className={`h-4 w-4 rounded-full border-2 border-primary bg-background transition-all duration-500 ${
                    isVisible ? "scale-100 shadow-[0_0_12px_hsl(var(--primary)/0.4)]" : "scale-50"
                  }`} />
                </div>

                {/* Right spacer — or header for step 1 */}
                <div className={`hidden md:block w-[45%] ${isLeft ? "" : "md:order-1"}`}>
                  {index === 0 && (
                    <div className="flex flex-col items-end text-right ml-8 -mt-32">
                      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                        How It Works
                      </p>
                      <h2 className="mb-4 text-4xl md:text-5xl font-bold text-foreground leading-tight">
                        From request to done — here's exactly what happens
                      </h2>
                      <p className="text-muted-foreground text-lg">
                        No sign-up fees, no subscriptions, no browsing. Post what you need and let experts compete for your job.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
