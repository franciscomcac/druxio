import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Clock, Users, Star, Check, Loader2, ArrowLeft, Send, Shield, Sparkles,
  Gamepad2, Code, Briefcase, Palette, Music, Dumbbell, Globe, Video,
  Swords, Crosshair, Pickaxe, Target, Trophy, ChevronRight,
  Bot, Monitor, Search, Server, Smartphone, Layout,
  TrendingUp, Rocket, ShoppingCart, Calculator,
  PenTool, Film, FileText, Image,
  Headphones, Guitar, Mic,
  Apple, Salad,
  BookOpen, Languages,
  Tv, Youtube, Clapperboard,
  MessageSquarePlus,
} from "lucide-react";

const BROAD_CATEGORIES = [
  { id: "Gaming", label: "Gaming", icon: Gamepad2, description: "Boosting, coaching & more" },
  { id: "Tech", label: "Tech", icon: Code, description: "Dev, bots, servers & SEO" },
  { id: "Business", label: "Business", icon: Briefcase, description: "Marketing, e-com & growth" },
  { id: "Creative", label: "Creative", icon: Palette, description: "Design, video & copy" },
  { id: "Music", label: "Music", icon: Music, description: "Production, mixing & lessons" },
  { id: "Fitness", label: "Fitness", icon: Dumbbell, description: "Training & nutrition" },
  { id: "Languages", label: "Languages", icon: Globe, description: "Tutoring & translation" },
  { id: "Content", label: "Content", icon: Video, description: "Streaming, YouTube & TikTok" },
];

const SUBCATEGORIES: Record<string, { id: string; label: string; icon: any }[]> = {
  Gaming: [
    { id: "Gaming: Valorant", label: "Valorant", icon: Crosshair },
    { id: "Gaming: Fortnite", label: "Fortnite", icon: Target },
    { id: "Gaming: Minecraft", label: "Minecraft", icon: Pickaxe },
    { id: "Gaming: CS2", label: "CS2", icon: Swords },
    { id: "Gaming: Apex", label: "Apex Legends", icon: Trophy },
    { id: "Gaming: League of Legends", label: "League of Legends", icon: Gamepad2 },
  ],
  Tech: [
    { id: "Tech: Discord Bots", label: "Discord Bots", icon: Bot },
    { id: "Tech: Web Dev", label: "Web Development", icon: Monitor },
    { id: "Tech: SEO", label: "SEO", icon: Search },
    { id: "Tech: Server Setup", label: "Server Setup", icon: Server },
    { id: "Tech: App Dev", label: "App Development", icon: Smartphone },
    { id: "Tech: WordPress", label: "WordPress", icon: Layout },
  ],
  Business: [
    { id: "Business: Marketing", label: "Marketing", icon: TrendingUp },
    { id: "Business: Startup", label: "Startup Advice", icon: Rocket },
    { id: "Business: E-commerce", label: "E-commerce", icon: ShoppingCart },
    { id: "Business: Accounting", label: "Accounting", icon: Calculator },
  ],
  Creative: [
    { id: "Creative: Design", label: "Graphic Design", icon: PenTool },
    { id: "Creative: Video Editing", label: "Video Editing", icon: Film },
    { id: "Creative: Ad Copy", label: "Ad Copy", icon: FileText },
    { id: "Creative: Thumbnails", label: "Thumbnails", icon: Image },
  ],
  Music: [
    { id: "Music: Production", label: "Production", icon: Headphones },
    { id: "Music: Mixing", label: "Mixing & Mastering", icon: Mic },
    { id: "Music: Guitar", label: "Guitar Lessons", icon: Guitar },
  ],
  Fitness: [
    { id: "Fitness: Training", label: "Personal Training", icon: Dumbbell },
    { id: "Fitness: Nutrition", label: "Nutrition Plans", icon: Apple },
  ],
  Languages: [
    { id: "Languages: English", label: "English", icon: BookOpen },
    { id: "Languages: Spanish", label: "Spanish", icon: Languages },
  ],
  Content: [
    { id: "Content: Streaming", label: "Streaming", icon: Tv },
    { id: "Content: YouTube", label: "YouTube", icon: Youtube },
    { id: "Content: TikTok", label: "TikTok", icon: Clapperboard },
  ],
};

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

  const [wizardStep, setWizardStep] = useState<"category" | "subcategory" | "details" | "waiting">("category");
  const [broadCategory, setBroadCategory] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [description, setDescription] = useState("");
  const [deadlineValue, setDeadlineValue] = useState(30);
  const [deadlineUnit, setDeadlineUnit] = useState<"minutes" | "hours" | "days">("minutes");
  
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [userId, setUserId] = useState<string | null>(null);

  // Track auth state reactively
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });
    // Also set initial value
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Resume waiting screen if jobId param provided
  useEffect(() => {
    const resumeJobId = searchParams.get("jobId");
    if (resumeJobId) {
      const resumeJob = async () => {
        // Reopen the job with a fresh 3-min window
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 3);
        await supabase.from("jobs").update({ status: "open", expires_at: expiresAt.toISOString() }).eq("id", resumeJobId);

        // Fetch job details
        const { data: job } = await supabase.from("jobs").select("*").eq("id", resumeJobId).single();
        if (job) {
          setTitle(job.title);
          setCategory(job.category);
          setJobId(job.id);
          setTimeLeft(180);
          setWizardStep("waiting");

          const mainCat = job.category.split(":")[0]?.trim() || job.category;
          const { count } = await supabase.from("expert_categories").select("*", { count: "exact", head: true }).ilike("category", `%${mainCat}%`);
          setOnlineCount(count || 0);

          // Load existing quotes
          const { data: existingQuotes } = await supabase.from("quotes").select("*").eq("job_id", resumeJobId).eq("status", "pending");
          if (existingQuotes) {
            const enriched = await Promise.all(existingQuotes.map(async (q) => {
              const { data: profile } = await supabase.from("profiles").select("display_name, rating_avg, total_sessions").eq("id", q.expert_id).single();
              return { ...q, expert_profile: profile };
            }));
            setQuotes(enriched as any);
          }
        }
      };
      resumeJob();
      return;
    }

    if (searchParams.get("category")) {
      const cat = searchParams.get("category")!;
      const broad = cat.split(":")[0]?.trim() || cat;
      setBroadCategory(broad);
      setCategory(cat);
      setWizardStep("details");
    }
  }, []);

  const handleSelectBroad = (id: string) => {
    setBroadCategory(id);
    setWizardStep("subcategory");
  };

  const handleSelectSub = (id: string) => {
    setCategory(id);
    setWizardStep("details");
  };

  const handleBack = () => {
    if (wizardStep === "subcategory") setWizardStep("category");
    else if (wizardStep === "details") setWizardStep("subcategory");
    else navigate(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !title) return;
    setLoading(true);

    try {
      if (!userId) {
        setLoading(false);
        navigate("/auth");
        return;
      }

      const mainCategory = category.split(":")[0]?.trim() || category;
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 3);

      const { data, error } = await supabase
        .from("jobs")
        .insert({
          buyer_id: userId,
          title,
          description: description || null,
          category,
          budget_min: 5,
          budget_max: 50,
          deadline_minutes: deadlineUnit === "days" ? deadlineValue * 1440 : deadlineUnit === "hours" ? deadlineValue * 60 : deadlineValue,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Job insert error:", error);
        toast({ title: "Error posting request", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Fetch expert count in background (non-blocking)
      supabase
        .from("expert_categories")
        .select("*", { count: "exact", head: true })
        .ilike("category", `%${mainCategory}%`)
        .then(({ count }) => setOnlineCount(count || 0));

      setJobId(data.id);
      setLoading(false);
      navigate(`/request/${data.id}`);
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({ title: "Error posting request", description: err?.message || "Something went wrong", variant: "destructive" });
      setLoading(false);
    }
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
    if (wizardStep !== "waiting") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [wizardStep]);

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

  const stepNumber = wizardStep === "category" ? 1 : wizardStep === "subcategory" ? 2 : 3;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">

        {/* Step indicator for wizard steps */}
        {wizardStep !== "waiting" && (
          <div className="mx-auto max-w-3xl mb-8 animate-fade-in">
            <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex items-center gap-3 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    s < stepNumber ? "bg-primary text-primary-foreground" :
                    s === stepNumber ? "bg-primary text-primary-foreground shadow-glow" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {s < stepNumber ? <Check className="h-4 w-4" /> : s}
                  </div>
                  {s < 3 && <div className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${s < stepNumber ? "bg-primary" : "bg-border/40"}`} />}
                </div>
              ))}
              <span className="ml-3 text-sm text-muted-foreground">
                {wizardStep === "category" ? "Choose a category" : wizardStep === "subcategory" ? "Pick a specialty" : "Describe your request"}
              </span>
            </div>
          </div>
        )}

        {/* Step 1: Broad category */}
        {wizardStep === "category" && (
          <div className="mx-auto max-w-3xl animate-fade-in">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Step 1</p>
              <h1 className="mb-2 text-3xl font-bold text-foreground">What do you need help with?</h1>
              <p className="text-muted-foreground">Choose a category to find the right experts.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {BROAD_CATEGORIES.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectBroad(cat.id)}
                    className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-glow hover:-translate-y-1 animate-slide-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/30">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{cat.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
                    </div>
                    <ChevronRight className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Subcategory */}
        {wizardStep === "subcategory" && (
          <div className="mx-auto max-w-3xl animate-fade-in">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Step 2</p>
              <h1 className="mb-2 text-3xl font-bold text-foreground">
                What kind of <span className="text-primary">{broadCategory}</span>?
              </h1>
              <p className="text-muted-foreground">Pick a specialty so we can match you with the best experts.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(SUBCATEGORIES[broadCategory] || []).map((sub, i) => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSub(sub.id)}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-glow hover:-translate-y-1 animate-slide-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/30">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="font-semibold text-foreground">{sub.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5" />
                  </button>
                );
              })}
              {/* Custom Request option */}
              <button
                onClick={() => handleSelectSub(`${broadCategory}: Custom`)}
                className="group flex items-center gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-glow hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${(SUBCATEGORIES[broadCategory]?.length || 0) * 60}ms` }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/[0.12] text-primary transition-transform duration-300 group-hover:scale-110">
                  <MessageSquarePlus className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-foreground">Custom Request</span>
                  <p className="text-xs text-muted-foreground">Something else in {broadCategory}</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details form */}
        {wizardStep === "details" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Step 3</p>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Describe your request</h1>
              <p className="text-muted-foreground">
                Category: <span className="text-primary font-medium">{category}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-xl">
                <CardContent className="space-y-5 pt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input placeholder='e.g. "Fix Minecraft server TPS drops"' value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} className="bg-background/60 border-border/40 focus:border-primary/40" />
                  </div>

                   <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Estimated Time Needed</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={deadlineValue}
                        onChange={(e) => setDeadlineValue(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 bg-background/60 border-border/40 focus:border-primary/40"
                      />
                      <div className="flex rounded-lg border border-border/40 overflow-hidden bg-background/60">
                        {(["minutes", "hours", "days"] as const).map((unit) => (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => setDeadlineUnit(unit)}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${
                              deadlineUnit === unit
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"
                            }`}
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description</label>
                    <Textarea placeholder="Describe your issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 bg-background/60 border-border/40 focus:border-primary/40" maxLength={1000} />
                  </div>

                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500" disabled={loading || !title}>
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
        )}

        {/* Waiting screen */}
        {wizardStep === "waiting" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
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
              <p className="text-muted-foreground animate-fade-in [animation-delay:200ms]">Experts will propose their own timelines</p>

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
                    No experts available right now. Try a broader category.
                  </div>
                ) : null}
              </div>
            </div>

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
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary/60" /> {quote.estimated_minutes >= 1440 ? `${Math.round(quote.estimated_minutes / 1440)} day${Math.round(quote.estimated_minutes / 1440) !== 1 ? "s" : ""}` : quote.estimated_minutes >= 60 ? `${Math.round(quote.estimated_minutes / 60)} hour${Math.round(quote.estimated_minutes / 60) !== 1 ? "s" : ""}` : `${quote.estimated_minutes} min`}</span>
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
