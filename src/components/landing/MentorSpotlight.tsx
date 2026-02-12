import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const recentRequests = [
  { title: "Fix Minecraft plugin NullPointer error", category: "Gaming", budget: "€12", deadline: "30min", status: "3 quotes received" },
  { title: "Discord bot not responding to slash commands", category: "Tech Support", budget: "€8", deadline: "15min", status: "Expert hired" },
  { title: "Set up Shopify dropshipping store", category: "Business", budget: "€35", deadline: "60min", status: "2 quotes received" },
  { title: "Design YouTube channel banner", category: "Creative", budget: "€15", deadline: "45min", status: "In progress" },
  { title: "Valorant coaching session Silver→Gold", category: "Gaming", budget: "€20", deadline: "60min", status: "1 quote received" },
];

const MentorSpotlight = () => {
  return (
    <section className="bg-card/20 py-24">
      <div className="container mx-auto px-4">
        <div className="mb-14 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-foreground animate-fade-in">Recent Requests</h2>
            <p className="text-muted-foreground animate-fade-in [animation-delay:100ms]">See what people are getting help with right now</p>
          </div>
          <Link to="/post-request">
            <Button className="gap-2 hover-scale">Post Your Request <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {recentRequests.map((req, i) => (
            <Card key={i} className="group border-border/50 bg-card/60 backdrop-blur-sm transition-all duration-500 hover:shadow-lg hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <CardContent className="p-4">
                <Badge variant="outline" className="mb-3 text-xs font-normal border-border/60">{req.category}</Badge>
                <h3 className="mb-3 font-medium text-foreground line-clamp-2 text-sm">{req.title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground text-base">{req.budget}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {req.deadline}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xs text-primary/70 font-medium">{req.status}</span>
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
