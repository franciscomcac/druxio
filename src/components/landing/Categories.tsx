import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2, Code, Briefcase, Palette,
  Music, Dumbbell, Globe, Camera
} from "lucide-react";

const categories = [
  { name: "Gaming", slug: "gaming", icon: <Gamepad2 className="h-6 w-6" />, subcategories: ["Minecraft", "Valorant", "Fortnite", "CS2", "Apex", "LoL"], color: "from-primary/15 to-primary/5" },
  { name: "Tech", slug: "tech", icon: <Code className="h-6 w-6" />, subcategories: ["Discord Bots", "Web Dev", "SEO", "Server Setup", "App Dev", "WordPress"], color: "from-primary/12 to-primary/5" },
  { name: "Business", slug: "business", icon: <Briefcase className="h-6 w-6" />, subcategories: ["Marketplace", "Dropshipping", "Accounting", "Legal", "Marketing", "Startup"], color: "from-primary/15 to-primary/5" },
  { name: "Creative", slug: "creative", icon: <Palette className="h-6 w-6" />, subcategories: ["Ad Copy", "Logo Design", "Video Editing", "Thumbnails", "UI/UX", "Branding"], color: "from-primary/12 to-primary/5" },
  { name: "Music", slug: "music", icon: <Music className="h-6 w-6" />, subcategories: ["Production", "Mixing", "Guitar", "Piano", "Vocals", "Beat Making"], color: "from-primary/15 to-primary/5" },
  { name: "Fitness", slug: "fitness", icon: <Dumbbell className="h-6 w-6" />, subcategories: ["Personal Training", "Nutrition", "Yoga", "Weight Loss"], color: "from-primary/12 to-primary/5" },
  { name: "Languages", slug: "languages", icon: <Globe className="h-6 w-6" />, subcategories: ["English", "Spanish", "French", "Japanese", "German"], color: "from-primary/15 to-primary/5" },
  { name: "Content", slug: "content", icon: <Camera className="h-6 w-6" />, subcategories: ["Streaming", "YouTube", "TikTok", "Photography", "Podcasting"], color: "from-primary/12 to-primary/5" },
];

const Categories = () => {
  const navigate = useNavigate();
  return (
    <section id="categories" className="relative bg-background py-28 overflow-hidden">
      <div className="absolute bottom-0 right-[10%] h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-16 flex flex-col items-start gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary animate-fade-in">Categories</p>
            <h2 className="mb-3 text-4xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">
              Find Your Expert
            </h2>
            <p className="max-w-lg text-muted-foreground animate-fade-in [animation-delay:200ms]">
              Whatever you need — there's a verified expert ready to help, right now.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat, i) => (
            <div
              key={cat.name}
              className="group rounded-2xl border border-border/30 bg-card/40 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20 hover:shadow-glow hover:-translate-y-2 animate-slide-up cursor-pointer"
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={() => navigate(`/category/${cat.slug}`)}
            >
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.color} text-primary transition-transform duration-500 group-hover:scale-110`}>
                {cat.icon}
              </div>
              <h3 className="mb-3 text-lg font-semibold text-foreground">{cat.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {cat.subcategories.map((sub) => (
                  <Badge key={sub} variant="outline" className="text-xs font-normal border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
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
