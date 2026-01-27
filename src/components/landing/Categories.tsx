import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Code, Database, Cloud, Terminal, Gamepad2, 
  TrendingUp, Server, Palette, ChevronDown, ChevronUp
} from "lucide-react";

interface Category {
  name: string;
  icon: React.ReactNode;
  color: string;
}

const categoryGroups = {
  "Frontend": [
    { name: "React", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "Next.js", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "TypeScript", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "JavaScript", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "HTML/CSS", icon: <Palette className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "Tailwind CSS", icon: <Palette className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "Vue.js", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
    { name: "Angular", icon: <Code className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
  ],
  "Backend": [
    { name: "Java", icon: <Terminal className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Python", icon: <Terminal className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Node.js", icon: <Server className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Express", icon: <Server className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Spring Boot", icon: <Terminal className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Django", icon: <Terminal className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "FastAPI", icon: <Terminal className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
    { name: "Go", icon: <Terminal className="h-4 w-4" />, color: "bg-secondary/20 text-secondary" },
  ],
  "Database & Cloud": [
    { name: "PostgreSQL", icon: <Database className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "MongoDB", icon: <Database className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Supabase", icon: <Database className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Firebase", icon: <Cloud className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "AWS", icon: <Cloud className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Docker", icon: <Server className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "Redis", icon: <Database className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
    { name: "GraphQL", icon: <Database className="h-4 w-4" />, color: "bg-chart-1/20 text-chart-5" },
  ],
  "Gaming & More": [
    { name: "Valorant", icon: <Gamepad2 className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "CS:GO", icon: <Gamepad2 className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Minecraft", icon: <Gamepad2 className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Discord Bots", icon: <Terminal className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Arbitrage", icon: <TrendingUp className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "SEO", icon: <TrendingUp className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Git/CI-CD", icon: <Terminal className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
    { name: "Testing", icon: <Code className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
  ],
};

const Categories = () => {
  const [expanded, setExpanded] = useState(false);
  const displayGroups = expanded 
    ? Object.entries(categoryGroups) 
    : Object.entries(categoryGroups).slice(0, 2);

  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            50+ Expert Categories
          </h2>
          <p className="text-muted-foreground">
            From React debugging to Valorant strategies — we've got mentors for everything
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
