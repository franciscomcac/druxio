import { useState, useEffect, useCallback } from "react";
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
  // Gaming (15)
  { title: "Fix Minecraft plugin NullPointer error", category: "Gaming", budget: "€12", deadline: "30min" },
  { title: "Valorant coaching session Silver→Gold", category: "Gaming", budget: "€20", deadline: "60min" },
  { title: "Fortnite creative map building help", category: "Gaming", budget: "€18", deadline: "45min" },
  { title: "CS2 rank boost from Gold Nova to MG", category: "Gaming", budget: "€25", deadline: "90min" },
  { title: "Apex Legends coaching Diamond push", category: "Gaming", budget: "€22", deadline: "60min" },
  { title: "League of Legends jungle pathing guide", category: "Gaming", budget: "€15", deadline: "45min" },
  { title: "Roblox Lua scripting for my game", category: "Gaming", budget: "€16", deadline: "30min" },
  { title: "GTA RP server configuration help", category: "Gaming", budget: "€20", deadline: "60min" },
  { title: "Minecraft modpack setup & optimization", category: "Gaming", budget: "€14", deadline: "45min" },
  { title: "Overwatch 2 placement match coaching", category: "Gaming", budget: "€18", deadline: "60min" },
  { title: "Rust base design consultation", category: "Gaming", budget: "€10", deadline: "30min" },
  { title: "FIFA Ultimate Team squad building", category: "Gaming", budget: "€8", deadline: "15min" },
  { title: "Pokemon competitive team builder", category: "Gaming", budget: "€12", deadline: "30min" },
  { title: "Escape from Tarkov loot run guide", category: "Gaming", budget: "€15", deadline: "45min" },
  { title: "Rocket League aerial training coach", category: "Gaming", budget: "€18", deadline: "60min" },

  // Tech (15)
  { title: "Discord bot not responding to slash commands", category: "Tech", budget: "€8", deadline: "15min" },
  { title: "WordPress site speed optimization", category: "Tech", budget: "€18", deadline: "45min" },
  { title: "Python script for web scraping", category: "Tech", budget: "€20", deadline: "30min" },
  { title: "Fix React app deployment on Vercel", category: "Tech", budget: "€12", deadline: "20min" },
  { title: "Set up CI/CD pipeline with GitHub Actions", category: "Tech", budget: "€25", deadline: "60min" },
  { title: "Docker container not starting — debug", category: "Tech", budget: "€15", deadline: "30min" },
  { title: "API integration with Stripe payments", category: "Tech", budget: "€30", deadline: "60min" },
  { title: "MongoDB query optimization help", category: "Tech", budget: "€18", deadline: "30min" },
  { title: "Linux server SSH access issue", category: "Tech", budget: "€10", deadline: "15min" },
  { title: "Build a Telegram notification bot", category: "Tech", budget: "€22", deadline: "45min" },
  { title: "Next.js SSR hydration error fix", category: "Tech", budget: "€14", deadline: "20min" },
  { title: "AWS S3 bucket permissions setup", category: "Tech", budget: "€16", deadline: "30min" },
  { title: "Google Sheets automation with Apps Script", category: "Tech", budget: "€12", deadline: "30min" },
  { title: "Chrome extension not loading — debug", category: "Tech", budget: "€15", deadline: "30min" },
  { title: "Set up custom email domain with DNS", category: "Tech", budget: "€10", deadline: "20min" },

  // Business (12)
  { title: "Set up Shopify dropshipping store", category: "Business", budget: "€35", deadline: "60min" },
  { title: "SEO audit + keyword research report", category: "Business", budget: "€30", deadline: "45min" },
  { title: "Instagram growth strategy for brand", category: "Business", budget: "€28", deadline: "60min" },
  { title: "TikTok ad campaign setup & targeting", category: "Business", budget: "€25", deadline: "45min" },
  { title: "Resume & LinkedIn profile rewrite", category: "Business", budget: "€22", deadline: "30min" },
  { title: "Business plan review and feedback", category: "Business", budget: "€40", deadline: "90min" },
  { title: "Google Ads campaign audit", category: "Business", budget: "€35", deadline: "60min" },
  { title: "Email marketing funnel setup", category: "Business", budget: "€30", deadline: "60min" },
  { title: "Competitor analysis for SaaS startup", category: "Business", budget: "€28", deadline: "45min" },
  { title: "Product listing optimization for Amazon", category: "Business", budget: "€20", deadline: "30min" },
  { title: "Pitch deck design for investors", category: "Business", budget: "€45", deadline: "90min" },
  { title: "Social media content calendar creation", category: "Business", budget: "€18", deadline: "30min" },

  // Creative (12)
  { title: "Design YouTube channel banner", category: "Creative", budget: "€15", deadline: "45min" },
  { title: "Twitch overlay + alerts package", category: "Creative", budget: "€30", deadline: "60min" },
  { title: "Logo redesign for startup", category: "Creative", budget: "€25", deadline: "45min" },
  { title: "Brand identity kit for café", category: "Creative", budget: "€45", deadline: "90min" },
  { title: "Thumbnail design for YouTube videos", category: "Creative", budget: "€10", deadline: "20min" },
  { title: "Custom emoji pack for Discord server", category: "Creative", budget: "€12", deadline: "30min" },
  { title: "Poster design for music event", category: "Creative", budget: "€20", deadline: "45min" },
  { title: "UI mockup for mobile app idea", category: "Creative", budget: "€35", deadline: "60min" },
  { title: "Edit product photos for e-commerce", category: "Creative", budget: "€15", deadline: "30min" },
  { title: "Animated intro for YouTube channel", category: "Creative", budget: "€28", deadline: "45min" },
  { title: "Wedding invitation design", category: "Creative", budget: "€22", deadline: "60min" },
  { title: "T-shirt graphic design for merch", category: "Creative", budget: "€18", deadline: "30min" },

  // Music (8)
  { title: "Mix & master 2 tracks", category: "Music", budget: "€40", deadline: "60min" },
  { title: "Podcast intro jingle creation", category: "Music", budget: "€35", deadline: "45min" },
  { title: "Beat production (trap/drill)", category: "Music", budget: "€50", deadline: "90min" },
  { title: "Vocal tuning & autotune for single", category: "Music", budget: "€25", deadline: "30min" },
  { title: "Guitar tab transcription for 3 songs", category: "Music", budget: "€20", deadline: "45min" },
  { title: "Sound design for short film", category: "Music", budget: "€35", deadline: "60min" },
  { title: "Lo-fi beat for study playlist", category: "Music", budget: "€15", deadline: "30min" },
  { title: "Remix of existing track for DJ set", category: "Music", budget: "€40", deadline: "60min" },

  // Content (8)
  { title: "Edit 10-min YouTube video with effects", category: "Content", budget: "€30", deadline: "60min" },
  { title: "TikTok content strategy for 30 days", category: "Content", budget: "€25", deadline: "45min" },
  { title: "Write blog post about AI trends", category: "Content", budget: "€18", deadline: "30min" },
  { title: "Subtitles & captions for podcast episode", category: "Content", budget: "€12", deadline: "30min" },
  { title: "Twitch stream highlights compilation", category: "Content", budget: "€20", deadline: "45min" },
  { title: "Script for 5-min explainer video", category: "Content", budget: "€22", deadline: "30min" },
  { title: "Instagram Reel editing with transitions", category: "Content", budget: "€15", deadline: "20min" },
  { title: "Copywriting for landing page", category: "Content", budget: "€28", deadline: "45min" },
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
  const [visible, setVisible] = useState(() => pickRandom(allRequests, 5));
  const [fading, setFading] = useState(false);

  const cycle = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setVisible(pickRandom(allRequests, 5));
      setFading(false);
    }, 400);
  }, []);

  useEffect(() => {
    const interval = setInterval(cycle, 6000);
    return () => clearInterval(interval);
  }, [cycle]);

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

        <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 transition-all duration-400 ${fading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
          {visible.map((req, i) => (
            <Card
              key={`${req.title}-${i}`}
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
