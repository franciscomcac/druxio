import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Code, Briefcase, Music, Dumbbell, Camera, 
  Palette, BookOpen, Heart, Globe, ChevronDown, ChevronUp,
  Calculator, Utensils, Home, Car, Gamepad2, TrendingUp
} from "lucide-react";

const categoryGroups = {
  "Technology & Development": [
    { name: "Web Development", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "Mobile Apps", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "AI & Machine Learning", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "Cybersecurity", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "Data Science", icon: <Calculator className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "IT Support", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "Game Development", icon: <Gamepad2 className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "No-Code Tools", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
  ],
  "Business & Finance": [
    { name: "Startup Advice", icon: <Briefcase className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Marketing", icon: <TrendingUp className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Investing", icon: <TrendingUp className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Accounting", icon: <Calculator className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Legal Advice", icon: <Briefcase className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "E-commerce", icon: <Briefcase className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Real Estate", icon: <Home className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Career Coaching", icon: <Briefcase className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
  ],
  "Creative & Arts": [
    { name: "Graphic Design", icon: <Palette className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Video Editing", icon: <Camera className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Music Production", icon: <Music className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Photography", icon: <Camera className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Writing & Editing", icon: <BookOpen className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "UI/UX Design", icon: <Palette className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Animation", icon: <Palette className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Voice Acting", icon: <Music className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
  ],
  "Lifestyle & Wellness": [
    { name: "Fitness Training", icon: <Dumbbell className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Nutrition", icon: <Utensils className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Life Coaching", icon: <Heart className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Relationships", icon: <Heart className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Mental Health", icon: <Heart className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Language Learning", icon: <Globe className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Cooking", icon: <Utensils className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Auto & Mechanics", icon: <Car className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
  ],
  "Gaming & Entertainment": [
    { name: "Esports Coaching", icon: <Gamepad2 className="h-4 w-4" />, color: "bg-accent text-accent-foreground" },
    { name: "Streaming Setup", icon: <Camera className="h-4 w-4" />, color: "bg-accent text-accent-foreground" },
    { name: "Poker Strategy", icon: <Gamepad2 className="h-4 w-4" />, color: "bg-accent text-accent-foreground" },
    { name: "Chess", icon: <Gamepad2 className="h-4 w-4" />, color: "bg-accent text-accent-foreground" },
    { name: "Sports Betting", icon: <TrendingUp className="h-4 w-4" />, color: "bg-accent text-accent-foreground" },
    { name: "Collectibles", icon: <Briefcase className="h-4 w-4" />, color: "bg-accent text-accent-foreground" },
    { name: "Trivia & Quizzes", icon: <BookOpen className="h-4 w-4" />, color: "bg-accent text-accent-foreground" },
    { name: "VR/AR", icon: <Gamepad2 className="h-4 w-4" />, color: "bg-accent text-accent-foreground" },
  ],
};

const Categories = () => {
  const [expanded, setExpanded] = useState(false);
  const displayGroups = expanded 
    ? Object.entries(categoryGroups) 
    : Object.entries(categoryGroups).slice(0, 2);

  return (
    <section id="categories" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            100+ Expert Categories
          </h2>
          <p className="text-muted-foreground">
            From tech help to life coaching — find experts for literally anything
          </p>
        </div>

        <div className="space-y-8">
          {displayGroups.map(([group, categories]) => (
            <div key={group}>
              <h3 className="mb-4 text-lg font-semibold text-foreground">{group}</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category.name}
                    variant="outline"
                    className={`cursor-pointer gap-2 px-4 py-2 text-sm transition-all hover:scale-105 ${category.color}`}
                  >
                    {category.icon}
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="gap-2"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show All Categories <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Categories;
