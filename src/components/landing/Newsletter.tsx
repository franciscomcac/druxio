import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, DollarSign, ArrowRight, CheckCircle } from "lucide-react";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add to newsletter list
    setSubmitted(true);
  };

  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          {/* Newsletter signup */}
          <Card className="border-border bg-card">
            <CardContent className="p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">
                Stay in the Loop
              </h3>
              <p className="mb-6 text-muted-foreground">
                Get weekly tips, new mentor announcements, and exclusive deals.
              </p>
              
              {submitted ? (
                <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-4 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Thanks! Check your inbox.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" className="gap-2">
                    Subscribe <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Become a mentor CTA */}
          <Card className="border-primary bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <DollarSign className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-foreground">
                Become a Mentor
              </h3>
              <p className="mb-6 text-muted-foreground">
                Share your expertise and earn up to <span className="font-bold text-foreground">$500/week</span> helping 
                developers solve their toughest problems.
              </p>
              
              <ul className="mb-6 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Set your own rates & schedule
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  80% earnings, weekly payouts
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Build your reputation & network
                </li>
              </ul>

              <Button className="w-full gap-2">
                Apply to Mentor <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
