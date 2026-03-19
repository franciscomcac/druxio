import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2, Code, Briefcase, Palette,
  Music, Dumbbell, Globe, Camera
} from "lucide-react";

const categories = [
  { name: "Gaming", slug: "gaming", icon: <Gamepad2 className="h-6 w-6" />, subcategories: ["Valorant", "Arc Raiders", "Fortnite", "CS2", "Apex", "LoL"], color: "from-primary/15 to-primary/5" },
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
    <section id="categories" className="relative bg-background py-16 sm:py-28 overflow-hidden">
      <div className="absolute bottom-0 right-[10%] h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-10 sm:mb-16 flex flex-col items-start gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary animate-fade-in">Categories</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">
            Find Your Expert
          </h2>
          <p className="text-muted-foreground animate-fade-in [animation-delay:200ms]">
            Whatever you need — there's a verified expert ready to help, right now.
          </p>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat, i) => (
            <div
              key={cat.name}
              className="group rounded-sm border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-glow animate-slide-up cursor-pointer flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0 px-4 py-4 sm:p-6"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => navigate(`/category/${cat.slug}`)}
            >
              {/* Icon */}
              <div className={`shrink-0 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br ${cat.color} text-primary transition-transform duration-300 group-hover:scale-110 sm:mb-5`}>
                {cat.icon}
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground sm:mb-3">{cat.name}</h3>
                {/* Subcategories: single line truncated on mobile, wrapped on desktop */}
                <p className="text-xs text-muted-foreground truncate sm:hidden">
                  {cat.subcategories.slice(0, 4).join(" · ")}
                </p>
                <div className="hidden sm:flex flex-wrap gap-1.5">
                  {cat.subcategories.map((sub) => (
                    <Badge key={sub} variant="outline" className="text-xs font-normal border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
                      {sub}
                    </Badge>
                  ))}
                </div>
              </div>
              {/* Arrow indicator on mobile */}
              <svg className="sm:hidden shrink-0 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </section>

  );
};

export default Categories;
