import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, Clock, Users, Star, Check, Loader2, ArrowLeft, Send, Shield, Sparkles } from "lucide-react";

const CATEGORIES = [
  "Gaming: Minecraft", "Gaming: Valorant", "Gaming: Fortnite", "Gaming: CS2", "Gaming: Apex", "Gaming: League of Legends",
  "Tech: Discord Bots", "Tech: Web Dev", "Tech: SEO", "Tech: Server Setup", "Tech: App Dev", "Tech: WordPress",
  "Business: Marketing", "Business: Startup", "Business: E-commerce", "Business: Accounting",
  "Creative: Design", "Creative: Video Editing", "Creative: Ad Copy", "Creative: Thumbnails",
  "Music: Production", "Music: Mixing", "Music: Guitar",
  "Fitness: Training", "Fitness: Nutrition",
  "Languages: English", "Languages: Spanish",
  "Content: Streaming", "Content: YouTube", "Content: TikTok",
];

interface Quote {
  id: string;
  expert_id: string;
  price: number;
  estimated_minutes: number;
  message: string | null;
  created_at: string;
  expert_profile?: {
    display_name: string | null;
    rating_avg: number | null;
    total_sessions: number | null;
  };
}

const PostRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState<"form" | "waiting">("form");
  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [budget, setBudget] = useState([Number(searchParams.get("budget")) || 15]);
  const [deadline, setDeadline] = useState(searchParams.get("deadline") || "30");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const mainCategory = category.split(":")[0]?.trim() || category;
    const { count } = await supabase
      .from("expert_categories")
      .select("*", { count: "exact", head: true })
      .ilike("category", `%${mainCategory}%`);
    setOnlineCount(count || 0);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3);

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        buyer_id: session.user.id,
        title, description, category,
        budget_min: Math.max(5, budget[0] - 5),
        budget_max: budget[0],
        deadline_minutes: parseInt(deadline),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error posting request", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setJobId(data.id);
    setStep("waiting");
    setLoading(false);
  };

  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`quotes-${jobId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotes", filter: `job_id=eq.${jobId}` },
        async (payload) => {
          const quote = payload.new as any;
          const { data: profile } = await supabase.from("profiles").select("display_name, rating_avg, total_sessions").eq("id", quote.expert_id).single();
          setQuotes((prev) => [...prev, { ...quote, expert_profile: profile }]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  useEffect(() => {
    if (step !== "waiting") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleAcceptQuote = async (quote: Quote) => {
    if (!jobId) return;
    const { error: jobError } = await supabase.from("jobs").update({ status: "accepted", accepted_quote_id: quote.id }).eq("id", jobId);
    const { error: quoteError } = await supabase.from("quotes").update({ status: "accepted" }).eq("id", quote.id);
    if (jobError || quoteError) { toast({ title: "Error accepting quote", variant: "destructive" }); return; }
    toast({ title: "Expert hired! 🎉", description: `${quote.expert_profile?.display_name || "Expert"} is on the job.` });
    navigate("/dashboard");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const progressPercent = ((180 - timeLeft) / 180) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        {step === "form" ? (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">New Request</p>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Post a Request</h1>
              <p className="text-muted-foreground">Describe what you need and experts will send you quotes.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-xl">
                <CardContent className="space-y-5 pt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input placeholder='e.g. "Fix Minecraft server TPS drops"' value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} className="bg-background/60 border-border/40 focus:border-primary/40" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description</label>
                    <Textarea placeholder="Describe your issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 bg-background/60 border-border/40 focus:border-primary/40" maxLength={1000} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Category</label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="bg-background/60 border-border/40"><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Max Budget: <span className="text-primary font-bold">€{budget[0]}</span></label>
                    <Slider value={budget} onValueChange={setBudget} min={5} max={50} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>€5</span><span>€50</span></div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Deadline</label>
                    <Select value={deadline} onValueChange={setDeadline}>
                      <SelectTrigger className="bg-background/60 border-border/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500" disabled={loading || !title || !category}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                Post Request & Notify Experts
              </Button>

              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary/60" /> Escrow protected</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary/60" /> ~90s avg response</span>
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary/60" /> Free to post</span>
              </div>
            </form>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl animate-fade-in">
            {/* Live waiting screen */}
            <div className="mb-10 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-5 py-2.5 animate-fade-in">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </span>
                <span className="text-sm font-semibold text-primary">
                  Notifying {onlineCount} experts in {category.split(":")[0]?.trim()}
                </span>
              </div>
              <h1 className="mb-3 text-3xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">{title}</h1>
              <p className="text-muted-foreground animate-fade-in [animation-delay:200ms]">Budget: up to <span className="font-bold text-foreground">€{budget[0]}</span> · Deadline: {deadline} min</p>

              {/* Progress bar */}
              <div className="mt-6 mx-auto max-w-md animate-fade-in [animation-delay:300ms]">
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                </div>
                {timeLeft > 0 ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary/60" />
                    <span className="text-sm font-mono">{formatTime(timeLeft)} remaining</span>
                  </div>
                ) : quotes.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm">
                    No experts available right now. Try a broader category or increase your budget.
                  </div>
                ) : null}
              </div>
            </div>

            {/* Incoming quotes */}
            <div className="space-y-4">
              {quotes.length === 0 && timeLeft > 0 && (
                <Card className="border-dashed border-border/30 bg-card/30">
                  <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                    <div className="relative mb-6">
                      <div className="h-16 w-16 rounded-2xl bg-primary/[0.08] flex items-center justify-center">
                        <Send className="h-7 w-7 text-primary/60" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping opacity-40" />
                    </div>
                    <p className="font-semibold text-foreground mb-1">Waiting for expert responses...</p>
                    <p className="text-sm">Quotes usually arrive within 90 seconds</p>
                  </CardContent>
                </Card>
              )}

              {quotes.map((quote, i) => (
                <Card key={quote.id} className="border-border/30 bg-card/60 backdrop-blur-xl transition-all duration-500 hover:shadow-glow hover:-translate-y-1 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardContent className="flex items-center gap-5 p-6">
                    <Avatar className="h-14 w-14 border border-border/30">
                      <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold">
                        {quote.expert_profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{quote.expert_profile?.display_name || "Expert"}</h3>
                        {quote.expert_profile?.rating_avg ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span className="text-xs text-muted-foreground font-medium">{quote.expert_profile.rating_avg.toFixed(1)}</span>
                          </div>
                        ) : null}
                        {quote.expert_profile?.total_sessions ? (
                          <span className="text-xs text-muted-foreground">· {quote.expert_profile.total_sessions} jobs</span>
                        ) : null}
                      </div>
                      {quote.message && <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{quote.message}</p>}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary/60" /> {quote.estimated_minutes} min</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground mb-2">€{quote.price}</p>
                      <Button size="sm" className="gap-1.5 shadow-glow hover:shadow-glow-lg transition-shadow" onClick={() => handleAcceptQuote(quote)}>
                        <Check className="h-3.5 w-3.5" /> Hire
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PostRequest;
