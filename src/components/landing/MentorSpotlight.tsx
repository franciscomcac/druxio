import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const recentRequests = [
  { title: "Fix Minecraft plugin NullPointer error", category: "Gaming", budget: "€12", deadline: "30min", status: "3 quotes received", hot: true },
  { title: "Discord bot not responding to slash commands", category: "Tech", budget: "€8", deadline: "15min", status: "Expert hired", hot: false },
  { title: "Set up Shopify dropshipping store", category: "Business", budget: "€35", deadline: "60min", status: "2 quotes received", hot: true },
  { title: "Design YouTube channel banner", category: "Creative", budget: "€15", deadline: "45min", status: "In progress", hot: false },
  { title: "Valorant coaching session Silver→Gold", category: "Gaming", budget: "€20", deadline: "60min", status: "1 quote received", hot: false },
];

const MentorSpotlight = () => {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="relative bg-background py-28 overflow-hidden">
      <div className="absolute top-[20%] right-[5%] h-[400px] w-[400px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-16 flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="reveal">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Live Feed</p>
            <h2 className="mb-3 text-4xl font-bold text-foreground">Recent Requests</h2>
            <p className="text-muted-foreground">See what people are getting help with right now</p>
          </div>
          <div className="reveal reveal-right delay-200">
            <Link to="/post-request">
              <Button className="gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500">
                Post a Task <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {recentRequests.map((req, i) => (
            <Card
              key={i}
              className={`group border-border bg-card backdrop-blur-sm transition-all duration-500 hover:border-primary/30 hover:shadow-glow hover:-translate-y-2 reveal delay-${i * 100 + 100}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-xs font-normal border-primary/20 text-primary/80">{req.category}</Badge>
                  {req.hot && <TrendingUp className="h-3.5 w-3.5 text-primary animate-pulse" />}
                </div>
                <h3 className="mb-4 font-semibold text-foreground line-clamp-2 text-sm leading-snug">{req.title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-bold text-foreground text-lg">{req.budget}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {req.deadline}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-primary/80 font-medium">{req.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MentorSpotlight;
