import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, ArrowRight } from "lucide-react";
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
    <section className="bg-card/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-foreground">Live Requests</h2>
            <p className="text-muted-foreground">See what buyers are posting right now</p>
          </div>
          <Link to="/post-request">
            <Button className="gap-2">Post Your Request <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {recentRequests.map((req, i) => (
            <Card key={i} className="border-border bg-card transition-all hover:shadow-md">
              <CardContent className="p-4">
                <Badge variant="outline" className="mb-3 text-xs">{req.category}</Badge>
                <h3 className="mb-3 font-medium text-foreground line-clamp-2 text-sm">{req.title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-bold text-foreground text-base">{req.budget}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {req.deadline}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary font-medium">{req.status}</span>
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
