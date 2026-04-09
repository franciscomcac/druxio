import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const statuses = [
  "3 quotes received", "2 quotes received", "1 quote received",
  "Expert hired", "In progress", "4 quotes received", "5 quotes received",
];

const allRequests = [
  { title: "Fix Minecraft plugin NullPointer error", category: "Gaming", budget: "€12", deadline: "30min" },
  { title: "Valorant coaching session Silver→Gold", category: "Gaming", budget: "€20", deadline: "60min" },
  { title: "Fortnite creative map building help", category: "Gaming", budget: "€18", deadline: "45min" },
  { title: "CS2 rank boost from Gold Nova to MG", category: "Gaming", budget: "€25", deadline: "90min" },
  { title: "Apex Legends coaching Diamond push", category: "Gaming", budget: "€22", deadline: "60min" },
  { title: "Discord bot not responding to slash commands", category: "Tech", budget: "€8", deadline: "15min" },
  { title: "WordPress site speed optimization", category: "Tech", budget: "€18", deadline: "45min" },
  { title: "Python script for web scraping", category: "Tech", budget: "€20", deadline: "30min" },
  { title: "Fix React app deployment on Vercel", category: "Tech", budget: "€12", deadline: "20min" },
  { title: "Set up Shopify dropshipping store", category: "Business", budget: "€35", deadline: "60min" },
  { title: "SEO audit + keyword research report", category: "Business", budget: "€30", deadline: "45min" },
  { title: "Design YouTube channel banner", category: "Creative", budget: "€15", deadline: "45min" },
  { title: "Twitch overlay + alerts package", category: "Creative", budget: "€30", deadline: "60min" },
  { title: "Logo redesign for startup", category: "Creative", budget: "€25", deadline: "45min" },
  { title: "Mix & master 2 tracks", category: "Music", budget: "€40", deadline: "60min" },
  { title: "Beat production (trap/drill)", category: "Music", budget: "€50", deadline: "90min" },
  { title: "Edit 10-min YouTube video with effects", category: "Content", budget: "€30", deadline: "60min" },
  { title: "TikTok content strategy for 30 days", category: "Content", budget: "€25", deadline: "45min" },
];

function pickRandom(pool: typeof allRequests, count: number): (typeof allRequests[0] & { status: string; hot: boolean })[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(r => ({
    ...r,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    hot: Math.random() > 0.65,
  }));
}

const MentorSpotlight = () => {
  const ref = useScrollReveal<HTMLElement>();
  const [visible] = useState(() => pickRandom(allRequests, 6));

  return (
    <section ref={ref} className="relative bg-background py-12 md:py-28 overflow-hidden">
      <div className="absolute top-[20%] right-[5%] h-[400px] w-[400px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-8 md:mb-16 flex flex-col items-start gap-4 md:gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="reveal">
            <p className="mb-2 md:mb-3 text-xs md:text-sm font-semibold uppercase tracking-widest text-primary">Live Feed</p>
            <h2 className="mb-2 md:mb-3 text-2xl md:text-4xl font-bold text-foreground">Happening right now</h2>
            <p className="text-sm md:text-base text-muted-foreground">See what people are getting help with right now</p>
          </div>
          <div className="reveal reveal-right delay-200">
            <Link to="/post-request">
              <Button size="sm" className="gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500">
                Post a Task <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Masonry layout using CSS columns */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 md:gap-4 [&>*]:mb-3 md:[&>*]:mb-4">
          {visible.map((req, i) => (
            <Card
              key={`${req.title}-${i}`}
              className={`group break-inside-avoid border-border bg-card backdrop-blur-sm transition-all duration-500 hover:border-primary/30 hover:shadow-glow hover:-translate-y-1 reveal delay-${i * 100 + 100}`}
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <Badge variant="outline" className="text-[10px] md:text-xs font-normal border-primary/20 text-primary/80">{req.category}</Badge>
                  {req.hot && <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary animate-pulse" />}
                </div>
                <h3 className="mb-3 md:mb-4 font-semibold text-foreground line-clamp-2 text-xs md:text-sm leading-snug">{req.title}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-bold text-foreground text-base md:text-lg">{req.budget}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {req.deadline}
                  </div>
                </div>
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-border">
                  <span className="text-[10px] md:text-xs text-primary/80 font-medium">{req.status}</span>
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
