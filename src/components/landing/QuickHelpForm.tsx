import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowRight } from "lucide-react";

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
    <section className="bg-background py-20" id="quick-help">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground animate-fade-in">Post a Quick Request</h2>
            <p className="text-muted-foreground animate-fade-in [animation-delay:100ms]">Tell us what you need — experts are notified instantly</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/50 bg-card/60 p-8 backdrop-blur-sm animate-fade-in [animation-delay:200ms]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">What do you need help with?</label>
              <Input placeholder='e.g. "Fix Minecraft server TPS drops"' value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Budget: €{budget[0]}</label>
              <Slider value={budget} onValueChange={setBudget} min={5} max={50} step={1} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>€5</span><span>€50</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Deadline</label>
              <Select value={deadline} onValueChange={setDeadline}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2 hover-scale">
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
