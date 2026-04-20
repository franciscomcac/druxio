import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Zap } from "lucide-react";

const categories = [
  "Gaming: Minecraft", "Gaming: Valorant", "Gaming: Fortnite", "Gaming: CS2",
  "Tech: Discord Bots", "Tech: Web Dev", "Tech: SEO", "Tech: Server Setup",
  "Business: Marketing", "Business: Startup", "Business: E-commerce",
  "Creative: Design", "Creative: Video Editing", "Creative: Ad Copy",
];

const QuickHelpForm = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState([15]);
  const [deadline, setDeadline] = useState("30");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (category) params.set("category", category);
    params.set("budget", String(budget[0]));
    params.set("deadline", deadline);
    navigate(`/post-request?${params.toString()}`);
  };

  return (
    <section className="relative bg-card/10 py-28 overflow-hidden" id="quick-help">
      <div className="absolute top-[30%] left-[50%] -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/[0.04] blur-[150px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-2 animate-fade-in">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Try it now — free to post</span>
            </div>
            <h2 className="mb-3 text-4xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">Post a Quick Request</h2>
            <p className="text-muted-foreground text-lg animate-fade-in [animation-delay:200ms]">Tell us what you need — experts are notified instantly</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-md shadow-lg animate-slide-up [animation-delay:300ms]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">What do you need help with?</label>
              <Input placeholder='e.g. "Fix Minecraft server TPS drops"' value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-background/60 border-border focus:border-primary/40" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background/60 border-border"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Budget: <span className="text-primary font-bold">€{budget[0]}</span></label>
              <Slider value={budget} onValueChange={setBudget} min={5} max={50} step={1} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>€5</span><span>€50</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Deadline</label>
              <Select value={deadline} onValueChange={setDeadline}>
                <SelectTrigger className="bg-background/60 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500">
              Post Request & Notify Experts
              <ArrowRight className="h-5 w-5" />
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Free to post · Experts respond within 2 minutes · Escrow-protected
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default QuickHelpForm;
