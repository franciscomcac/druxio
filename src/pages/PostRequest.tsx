import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, Clock, Users, Star, Check, Loader2, ArrowLeft } from "lucide-react";

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
  const [timeLeft, setTimeLeft] = useState(180); // 3 min countdown

  // Submit the request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const mainCategory = category.split(":")[0]?.trim() || category;

    // Count online experts in this category
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
        title,
        description,
        category,
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

  // Real-time quote subscription
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`quotes-${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "quotes", filter: `job_id=eq.${jobId}` },
        async (payload) => {
          const quote = payload.new as any;
          // Fetch expert profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, rating_avg, total_sessions")
            .eq("id", quote.expert_id)
            .single();

          setQuotes((prev) => [...prev, { ...quote, expert_profile: profile }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  // Countdown timer
  useEffect(() => {
    if (step !== "waiting") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Accept a quote
  const handleAcceptQuote = async (quote: Quote) => {
    if (!jobId) return;

    const { error: jobError } = await supabase
      .from("jobs")
      .update({ status: "accepted", accepted_quote_id: quote.id })
      .eq("id", jobId);

    const { error: quoteError } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quote.id);

    if (jobError || quoteError) {
      toast({ title: "Error accepting quote", variant: "destructive" });
      return;
    }

    toast({ title: "Expert hired! 🎉", description: `${quote.expert_profile?.display_name || "Expert"} is on the job.` });
    navigate("/dashboard");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {step === "form" ? (
          <div className="mx-auto max-w-2xl">
            <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Post a Request</h1>
            <p className="mb-8 text-muted-foreground">Describe what you need and experts will send you quotes.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input placeholder='e.g. "Fix Minecraft server TPS drops"' value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description</label>
                    <Textarea placeholder="Describe your issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" maxLength={1000} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Category</label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Max Budget: €{budget[0]}</label>
                    <Slider value={budget} onValueChange={setBudget} min={5} max={50} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>€5</span><span>€50</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Deadline</label>
                    <Select value={deadline} onValueChange={setDeadline}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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

              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading || !title || !category}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                Post Request & Notify Experts
              </Button>
            </form>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            {/* Live waiting screen */}
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-foreground">
                  Notifying {onlineCount} experts in {category.split(":")[0]?.trim()}...
                </span>
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground">Budget: up to €{budget[0]} • Deadline: {deadline} min</p>
              
              {timeLeft > 0 ? (
                <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Waiting for quotes... {formatTime(timeLeft)}</span>
                </div>
              ) : quotes.length === 0 ? (
                <div className="mt-4 rounded-lg bg-destructive/10 p-4 text-destructive">
                  No experts available right now. Try a broader category or increase your budget.
                </div>
              ) : null}
            </div>

            {/* Incoming quotes */}
            <div className="space-y-4">
              {quotes.length === 0 && timeLeft > 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                    <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
                    <p className="font-medium">Waiting for expert responses...</p>
                    <p className="text-sm">Quotes usually arrive within 90 seconds</p>
                  </CardContent>
                </Card>
              )}

              {quotes.map((quote) => (
                <Card key={quote.id} className="border-border transition-all hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-6">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {quote.expert_profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {quote.expert_profile?.display_name || "Expert"}
                        </h3>
                        {quote.expert_profile?.rating_avg ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span className="text-xs text-muted-foreground">{quote.expert_profile.rating_avg.toFixed(1)}</span>
                          </div>
                        ) : null}
                        {quote.expert_profile?.total_sessions ? (
                          <span className="text-xs text-muted-foreground">• {quote.expert_profile.total_sessions} jobs</span>
                        ) : null}
                      </div>
                      {quote.message && <p className="text-sm text-muted-foreground mt-1">{quote.message}</p>}
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {quote.estimated_minutes} min</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">€{quote.price}</p>
                      <Button size="sm" className="mt-2 gap-1" onClick={() => handleAcceptQuote(quote)}>
                        <Check className="h-3 w-3" /> Hire
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
