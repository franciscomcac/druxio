import { MessageSquare, Sparkles, Video, Star } from "lucide-react";

const steps = [
  {
    icon: <MessageSquare className="h-8 w-8" />,
    title: "Describe What You Need",
    description: "Tell us what you're looking for — whether it's fixing a bug, learning guitar, or getting business advice.",
  },
  {
    icon: <Sparkles className="h-8 w-8" />,
    title: "AI Matches You",
    description: "Our AI instantly finds the best experts based on your needs, budget, and availability.",
  },
  {
    icon: <Video className="h-8 w-8" />,
    title: "Chat or Video Call",
    description: "Connect instantly via real-time chat or hop on a video call with your matched expert.",
  },
  {
    icon: <Star className="h-8 w-8" />,
    title: "Solve & Grow",
    description: "Get your answer, rate your expert, and track your progress towards your goals.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-card/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="text-muted-foreground">
            Get expert help in just 4 simple steps
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-12 hidden h-0.5 w-full -translate-y-1/2 bg-gradient-to-r from-primary/30 to-primary/10 lg:block" />
              )}
              
              <div className="relative flex flex-col items-center text-center">
                {/* Step number */}
                <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm">
                  {step.icon}
                </div>
                
                {/* Content */}
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
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
