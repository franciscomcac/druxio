import { Send, Bell, Handshake, CheckCircle, MessageSquare, Shield, CreditCard, Star } from "lucide-react";

const steps = [
  {
    icon: <Send className="h-7 w-7" />,
    title: "Pick a Category & Describe Your Need",
    description:
      "Head to \"Post a Request\" and choose a broad category like Gaming, Tech, or Creative. Then pick a specialty — for example Valorant, Discord Bots, or Video Editing. Finally, write a clear title and description of exactly what you need done. No budget to set — experts will compete on price for you.",
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
      "The moment you post, every online expert subscribed to your category gets a real-time notification. There's no browsing or searching — experts come to you. A 3-minute response window opens so you get fast, competitive quotes.",
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
      "Incoming quotes appear live on your screen — each one shows the expert's price, estimated delivery time, a personal message, their rating, and total completed jobs. Compare them side by side and hire the expert that fits your needs and budget best.",
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
      "Once you hire, your payment is held safely in escrow — the expert doesn't get paid until you're satisfied. A private chat opens where you can share details, files, and track progress. You stay in full control throughout the process.",
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
      "When the work is delivered, review the result. If you're happy, approve it and the payment is released to the expert. Leave a rating and review to help future buyers. The entire process — from posting to delivery — often takes just minutes.",
    details: [
      "Review the delivered work",
      "Approve to release payment",
      "Leave a rating and written review",
      "10% platform fee — no hidden costs",
    ],
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative py-28 overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-[20%] h-[400px] w-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] h-[300px] w-[300px] rounded-full bg-primary/[0.02] blur-[100px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary animate-fade-in">
            How It Works
          </p>
          <h2 className="mb-4 text-4xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">
            From request to done — here's exactly what happens
          </h2>
          <p className="text-muted-foreground text-lg animate-fade-in [animation-delay:200ms]">
            No sign-up fees, no subscriptions, no browsing. Post what you need and let experts compete for your job. Here's the full process, step by step.
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative flex flex-col md:flex-row gap-6 rounded-2xl border border-border bg-card/60 p-6 md:p-8 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:shadow-glow">
                {/* Left: number + icon */}
                <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-3 shrink-0 md:w-20">
                  <span className="text-5xl font-bold text-primary/40 select-none drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]">
                    0{index + 1}
                  </span>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary transition-transform duration-500 group-hover:scale-110">
                    {step.icon}
                  </div>
                </div>

                {/* Right: content */}
                <div className="flex-1">
                  <h3 className="mb-3 text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">{step.description}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
