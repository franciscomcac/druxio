import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CategoryTemplateFields from "@/components/post-request/CategoryTemplateFields";
import { supabase } from "@/integrations/supabase/client";
import { useModeration } from "@/hooks/use-moderation";
import Header from "@/components/layout/Header";
import QuickAuthDialog from "@/components/auth/QuickAuthDialog";
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
  MessageSquarePlus, Wand2, PencilLine,
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
  const { checkContent } = useModeration();

  const [wizardStep, setWizardStep] = useState<"category" | "subcategory" | "ai-refine" | "details" | "waiting" | "matching">("category");
  const [matchingData, setMatchingData] = useState<{ onlineSellers: number; avgResponseMin: number } | null>(null);
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
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const pendingSubmitRef = useRef(false);

  // AI refine state
  const [userIdea, setUserIdea] = useState("");
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title: string;
    description: string;
    category: string;
    broad_category: string;
    clarifying_note: string;
  } | null>(null);

  // Track auth state reactively & auto-submit after auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid && pendingSubmitRef.current) {
        pendingSubmitRef.current = false;
        setTimeout(() => {
          const form = document.getElementById("post-request-form") as HTMLFormElement;
          form?.requestSubmit();
        }, 100);
      }
    });
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
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 3);
        await supabase.from("jobs").update({ status: "open", expires_at: expiresAt.toISOString() }).eq("id", resumeJobId);

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
    else if (wizardStep === "ai-refine") {
      setAiResult(null);
      setWizardStep("category");
    }
    else if (wizardStep === "details") {
      if (aiResult) {
        setWizardStep("ai-refine");
      } else {
        setWizardStep("subcategory");
      }
    }
    else navigate("/");
  };

  const handleAiRefine = async () => {
    if (!userIdea.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-refine-request", {
        body: { userIdea: userIdea.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiResult(data);
    } catch (err: any) {
      console.error("AI refine error:", err);
      toast({
        title: "AI couldn't process your request",
        description: err?.message || "Please try again or pick a category manually.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptAiSuggestion = () => {
    if (!aiResult) return;
    setTitle(aiResult.title);
    setDescription(aiResult.description);
    setCategory(aiResult.category);
    setBroadCategory(aiResult.broad_category);
    setWizardStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !title) return;
    setLoading(true);

    // Moderation check
    const textToCheck = `${title} ${description || ""}`.trim();
    const flagged = await checkContent(textToCheck, "job request posting");
    if (flagged) {
      setLoading(false);
      return;
    }

    try {
      if (!userId) {
        setLoading(false);
        pendingSubmitRef.current = true;
        setShowAuthDialog(true);
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

      // Fetch online sellers for this category
      const catForSearch = category.split(":")[0]?.trim() || category;
      const { data: expertCats } = await supabase
        .from("expert_categories")
        .select("user_id")
        .ilike("category", `%${catForSearch}%`);

      let onlineSellers = 0;
      let avgResponseMin = 5;

      if (expertCats && expertCats.length > 0) {
        const uniqueIds = [...new Set(expertCats.map(e => e.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("is_online, response_time_minutes")
          .in("id", uniqueIds)
          .eq("is_online", true);

        onlineSellers = profiles?.length || 0;
        if (profiles && profiles.length > 0) {
          const times = profiles.map(p => p.response_time_minutes || 5);
          avgResponseMin = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        }
      }

      setOnlineCount(onlineSellers);
      setJobId(data.id);
      setMatchingData({ onlineSellers, avgResponseMin });
      setWizardStep("matching");
      setLoading(false);
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

  const stepNumber = wizardStep === "category" ? 1 : wizardStep === "subcategory" ? 2 : wizardStep === "ai-refine" ? 2 : wizardStep === "details" ? 3 : 3;
  const totalSteps = wizardStep === "ai-refine" || aiResult ? 3 : 3;

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
                {wizardStep === "category" ? "Choose a category" : wizardStep === "subcategory" ? "Pick a specialty" : wizardStep === "ai-refine" ? "Describe your idea" : "Describe your request"}
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

              {/* Custom Request - AI powered */}
              <button
                onClick={() => setWizardStep("ai-refine")}
                className="group relative flex flex-col items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] p-6 transition-all duration-300 hover:border-primary/60 hover:shadow-glow hover:-translate-y-1 animate-slide-up col-span-2 md:col-span-4"
                style={{ animationDelay: `${BROAD_CATEGORIES.length * 60}ms` }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/30">
                  <Wand2 className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Custom Request</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">Describe your idea & let AI find the best category</p>
                </div>
                <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">AI Powered</span>
                </div>
              </button>
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

        {/* AI Refine Step */}
        {wizardStep === "ai-refine" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Step 2</p>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Describe your idea</h1>
              <p className="text-muted-foreground">Tell us what you need — AI will refine it and find the best category.</p>
            </div>

            {/* Input area */}
            <Card className="border-border/30 bg-card/60 backdrop-blur-xl mb-6">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <PencilLine className="h-4 w-4 text-primary" />
                    What do you need help with?
                  </label>
                  <Textarea
                    placeholder="e.g. I want someone to build me a custom Discord bot that tracks server activity and sends daily reports..."
                    value={userIdea}
                    onChange={(e) => setUserIdea(e.target.value)}
                    className="min-h-28 bg-background/60 border-border/40 focus:border-primary/40 text-[15px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{userIdea.length}/500</p>
                </div>

                <Button
                  onClick={handleAiRefine}
                  disabled={!userIdea.trim() || aiLoading}
                  className="w-full gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI is thinking...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Refine with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* AI Result */}
            {aiResult && (
              <div className="space-y-4 animate-fade-in">
                {/* Clarifying note */}
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">AI understood your request</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiResult.clarifying_note}</p>
                  </div>
                </div>

                {/* Suggested fields */}
                <Card className="border-primary/20 bg-card/60 backdrop-blur-xl">
                  <CardContent className="pt-6 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Category</label>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                          <Zap className="h-3.5 w-3.5" />
                          {aiResult.category}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Title</label>
                      <p className="text-foreground font-semibold text-lg">{aiResult.title}</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Refined Description</label>
                      <p className="text-muted-foreground text-sm leading-relaxed">{aiResult.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAcceptAiSuggestion}
                    className="flex-1 gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500"
                  >
                    <Check className="h-4 w-4" />
                    Use this & continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAiRefine}
                    disabled={aiLoading}
                    className="gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </div>
            )}
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

            <form id="post-request-form" onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-border/30 bg-card/60 backdrop-blur-xl">
                <CardContent className="space-y-5 pt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input placeholder='e.g. "Fix Minecraft server TPS drops"' value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} className="bg-background/60 border-border/40 focus:border-primary/40" />
                  </div>

                   <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Max Time</label>
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

                  <CategoryTemplateFields
                    category={category}
                    templateData={templateData}
                    onChange={(key, value) => setTemplateData(prev => ({ ...prev, [key]: value }))}
                  />

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

        {/* Matching interstitial */}
        {wizardStep === "matching" && matchingData && (
          <div className="mx-auto max-w-lg animate-fade-in text-center py-8">
            <div className="mb-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-10 w-10 text-primary animate-fade-in" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in [animation-delay:100ms]">
                Request Posted!
              </h1>
              <p className="text-muted-foreground animate-fade-in [animation-delay:200ms]">
                We're notifying experts in <span className="font-semibold text-foreground">{category}</span>
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <Card className="border-primary/20 bg-primary/[0.04] animate-fade-in [animation-delay:300ms]">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-chart-2/10">
                    <Users className="h-6 w-6 text-chart-2" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">
                      {matchingData.onlineSellers}
                      <span className="text-base font-normal text-muted-foreground ml-1">
                        online seller{matchingData.onlineSellers !== 1 ? "s" : ""}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {matchingData.onlineSellers > 0
                        ? `Available right now for ${category.split(":")[0]?.trim()}`
                        : "No sellers online — they'll be notified when they come back"}
                    </p>
                  </div>
                  {matchingData.onlineSellers > 0 && (
                    <span className="ml-auto h-3 w-3 rounded-full bg-chart-2 animate-pulse shrink-0" />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/30 bg-card/60 animate-fade-in [animation-delay:400ms]">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">
                      ~{matchingData.avgResponseMin}
                      <span className="text-base font-normal text-muted-foreground ml-1">minutes</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Estimated time for first offer
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              size="lg"
              className="gap-2 shadow-glow w-full animate-fade-in [animation-delay:500ms]"
              onClick={() => navigate(`/request/${jobId}`)}
            >
              Go to Live Request <Zap className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3 animate-fade-in [animation-delay:600ms]">
              You'll see offers appear in real-time
            </p>
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
      <QuickAuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultTab="signup"
        onSuccess={() => setShowAuthDialog(false)}
      />
    </div>
  );
};

export default PostRequest;
