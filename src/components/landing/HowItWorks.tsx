import { Send, Bell, Handshake, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: <Send className="h-8 w-8" />,
    title: "Post Your Request",
    description: "Describe what you need, set your budget (€5–50), pick a category, and choose a deadline.",
  },
  {
    icon: <Bell className="h-8 w-8" />,
    title: "Experts Get Notified",
    description: "Online experts subscribed to your category are instantly pinged. No browsing needed.",
  },
  {
    icon: <Handshake className="h-8 w-8" />,
    title: "Pick a Quote",
    description: "Receive up to 3 fixed-price quotes within 2 minutes. Choose the best one to hire instantly.",
  },
  {
    icon: <CheckCircle className="h-8 w-8" />,
    title: "Get It Done",
    description: "Expert delivers, you approve and rate. Payment released from escrow. Done.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-card/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            How Duxio Works
          </h2>
          <p className="text-muted-foreground">
            From request to done in 4 steps — no marketplace browsing
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-12 hidden h-0.5 w-full -translate-y-1/2 bg-gradient-to-r from-primary/30 to-primary/10 lg:block" />
              )}
              
              <div className="relative flex flex-col items-center text-center">
                <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
                
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm">
                  {step.icon}
                </div>
                
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
