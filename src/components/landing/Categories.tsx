import { Badge } from "@/components/ui/badge";
import {
  Gamepad2, Code, Briefcase, Palette,
  Music, Dumbbell, Globe, Camera
} from "lucide-react";

const categories = [
  { name: "Gaming", icon: <Gamepad2 className="h-5 w-5" />, subcategories: ["Minecraft", "Valorant", "Fortnite", "CS2", "Apex", "League of Legends"] },
  { name: "Tech Support", icon: <Code className="h-5 w-5" />, subcategories: ["Discord Bots", "Web Dev", "SEO", "Server Setup", "App Dev", "WordPress"] },
  { name: "Business", icon: <Briefcase className="h-5 w-5" />, subcategories: ["Marketplace Setup", "Dropshipping", "Accounting", "Legal", "Marketing", "Startup"] },
  { name: "Creative", icon: <Palette className="h-5 w-5" />, subcategories: ["Ad Copy", "Logo Design", "Video Editing", "Thumbnails", "UI/UX", "Branding"] },
  { name: "Music", icon: <Music className="h-5 w-5" />, subcategories: ["Production", "Mixing", "Guitar", "Piano", "Vocals", "Beat Making"] },
  { name: "Fitness", icon: <Dumbbell className="h-5 w-5" />, subcategories: ["Personal Training", "Nutrition", "Yoga", "Weight Loss", "Bodybuilding"] },
  { name: "Languages", icon: <Globe className="h-5 w-5" />, subcategories: ["English", "Spanish", "French", "Japanese", "German", "Chinese"] },
  { name: "Content", icon: <Camera className="h-5 w-5" />, subcategories: ["Streaming", "YouTube", "TikTok", "Photography", "Podcasting"] },
];

const Categories = () => {
  return (
    <section id="categories" className="bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground animate-fade-in">
            Explore Categories
          </h2>
          <p className="text-muted-foreground animate-fade-in [animation-delay:100ms]">
            Whatever you need — there's an expert ready to help
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat, i) => (
            <div
              key={cat.name}
              className="group rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.07] text-primary transition-colors duration-300 group-hover:bg-primary/[0.12]">
                {cat.icon}
              </div>
              <h3 className="mb-3 text-lg font-semibold text-foreground">{cat.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {cat.subcategories.map((sub) => (
                  <Badge key={sub} variant="outline" className="text-xs font-normal border-border/60">
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
