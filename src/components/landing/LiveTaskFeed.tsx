import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock } from "lucide-react";

const SAMPLE_TASKS = [
  { title: "Fix Minecraft server TPS drops", category: "Gaming", budget: "€12", time: "2s ago" },
  { title: "Discord bot setup with slash commands", category: "Tech", budget: "€15", time: "8s ago" },
  { title: "Valorant coaching session (Silver→Gold)", category: "Gaming", budget: "€20", time: "15s ago" },
  { title: "Logo redesign for SaaS startup", category: "Creative", budget: "€25", time: "22s ago" },
  { title: "WordPress speed optimization", category: "Tech", budget: "€18", time: "35s ago" },
  { title: "SEO audit for e-commerce site", category: "Business", budget: "€30", time: "1m ago" },
  { title: "Mix and master 3 tracks", category: "Music", budget: "€40", time: "1m ago" },
  { title: "Personal training program", category: "Fitness", budget: "€15", time: "2m ago" },
];

const LiveTaskFeed = () => {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);

  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prev) => {
        const shuffled = [...SAMPLE_TASKS].sort(() => Math.random() - 0.5);
        return shuffled;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-card/10 py-20">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Live Feed</p>
            </div>
            <h2 className="text-3xl font-bold text-foreground">Recent tasks</h2>
          </div>
          <Link to="/post-request">
            <Button variant="outline" className="gap-2 rounded-sm border-border/50 hidden md:flex">
              Post yours <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="border border-border/30 rounded-sm overflow-hidden bg-border/30">
          <div className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_120px_80px_80px] bg-card/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="px-4 py-3">Task</div>
            <div className="px-4 py-3 hidden md:block">Category</div>
            <div className="px-4 py-3 text-right">Budget</div>
            <div className="px-4 py-3 text-right">Posted</div>
          </div>
          {tasks.slice(0, 6).map((task, i) => (
            <div key={`${task.title}-${i}`} className="grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_120px_80px_80px] bg-card/60 border-t border-border/20 hover:bg-card/80 transition-colors">
              <div className="px-4 py-3 text-sm font-medium text-foreground truncate">{task.title}</div>
              <div className="px-4 py-3 text-xs text-muted-foreground hidden md:block">{task.category}</div>
              <div className="px-4 py-3 text-sm font-semibold text-foreground text-right">{task.budget}</div>
              <div className="px-4 py-3 text-xs text-muted-foreground text-right flex items-center justify-end gap-1">
                <Clock className="h-3 w-3" /> {task.time}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 md:hidden">
          <Link to="/post-request">
            <Button className="w-full gap-2 rounded-sm">
              Post a Task <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LiveTaskFeed;
