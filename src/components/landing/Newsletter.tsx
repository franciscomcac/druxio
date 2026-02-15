import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, CheckCircle } from "lucide-react";

const Newsletter = () => {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">Ready to get started?</h2>
          <p className="mb-8 text-muted-foreground text-lg">Post your first task in 30 seconds. No sign-up fees, no subscriptions.</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link to="/post-request">
              <Button size="lg" className="gap-2 rounded-sm px-8 h-12 text-base font-semibold">
                Post a Task <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="gap-2 rounded-sm px-8 h-12 text-base border-border/50">
                <Zap className="h-4 w-4" /> Earn as Expert
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {["Free to post", "Escrow-protected", "Pay when satisfied", "90s avg response"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary/70" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
