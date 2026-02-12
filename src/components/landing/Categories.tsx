import { Badge } from "@/components/ui/badge";
import { 
  Gamepad2, Code, Briefcase, Palette, 
  Music, Dumbbell, Globe, Camera
} from "lucide-react";

const categories = [
  { name: "Gaming", icon: <Gamepad2 className="h-5 w-5" />, subcategories: ["Minecraft", "Valorant", "Fortnite", "CS2", "Apex", "League of Legends"], color: "bg-primary/10 text-primary" },
  { name: "Tech Support", icon: <Code className="h-5 w-5" />, subcategories: ["Discord Bots", "Web Dev", "SEO", "Server Setup", "App Dev", "WordPress"], color: "bg-primary/10 text-primary" },
  { name: "Business", icon: <Briefcase className="h-5 w-5" />, subcategories: ["Marketplace Setup", "Dropshipping", "Accounting", "Legal", "Marketing", "Startup"], color: "bg-secondary/20 text-secondary-foreground" },
  { name: "Creative", icon: <Palette className="h-5 w-5" />, subcategories: ["Ad Copy", "Logo Design", "Video Editing", "Thumbnails", "UI/UX", "Branding"], color: "bg-chart-1/20 text-foreground" },
  { name: "Music", icon: <Music className="h-5 w-5" />, subcategories: ["Production", "Mixing", "Guitar", "Piano", "Vocals", "Beat Making"], color: "bg-chart-2/20 text-foreground" },
  { name: "Fitness", icon: <Dumbbell className="h-5 w-5" />, subcategories: ["Personal Training", "Nutrition", "Yoga", "Weight Loss", "Bodybuilding"], color: "bg-destructive/10 text-foreground" },
  { name: "Languages", icon: <Globe className="h-5 w-5" />, subcategories: ["English", "Spanish", "French", "Japanese", "German", "Chinese"], color: "bg-chart-3/20 text-foreground" },
  { name: "Content", icon: <Camera className="h-5 w-5" />, subcategories: ["Streaming", "YouTube", "TikTok", "Photography", "Podcasting"], color: "bg-chart-4/20 text-foreground" },
];

const Categories = () => {
  return (
    <section id="categories" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Request Help in Any Category
          </h2>
          <p className="text-muted-foreground">
            Post a request and experts in that field get notified instantly
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <div key={cat.name} className="rounded-xl border border-border bg-card p-6 transition-all hover:shadow-md">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${cat.color}`}>
                {cat.icon}
              </div>
              <h3 className="mb-3 text-lg font-semibold text-foreground">{cat.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {cat.subcategories.map((sub) => (
                  <Badge key={sub} variant="outline" className="text-xs">
                    {sub}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
