import { useState, useEffect } from "react";
import { startSellerTutorial } from "@/components/onboarding/SellerTutorial";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Star, Clock, Bell, Send, Loader2, Settings, Target, Zap, MessageSquare,
  Package, CheckCircle2, AlertTriangle, ArrowRight, X, ChevronRight, FileText,
  Gamepad2, Code, Briefcase, Palette, Music, Dumbbell, Globe, Video,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  title: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  budget_max: number;
  deadline_minutes: number;
  status: string;
  created_at: string;
  expires_at: string | null;
  buyer_id: string;
}

interface OrderData {
  job: any;
  quote: any;
  buyerProfile: any;
}

interface ExpertDashboardProps {
  profile: any;
  subscribedCategories: string[];
}

const formatDeliveryTime = (minutes: number) => {
  if (minutes >= 1440) { const d = Math.round(minutes / 1440); return `${d}d`; }
  if (minutes >= 60) { const h = Math.round(minutes / 60); return `${h}h`; }
  return `${minutes}min`;
};

const timeAgo = (date: string) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
};

const CATEGORY_ICONS: Record<string, any> = {
  Gaming: Gamepad2, Tech: Code, Business: Briefcase, Creative: Palette,
  Music: Music, Fitness: Dumbbell, Languages: Globe, Content: Video,
};

const getCategoryGroup = (category: string) => {
  const broad = category.split(":")[0]?.trim() || category;
  return { broad, icon: CATEGORY_ICONS[broad] || Zap };
};

type GroupedItems<T> = { broad: string; sub: string | null; icon: any; items: T[] }[];

function groupByCategory<T>(items: T[], getCat: (item: T) => string, subscribedCats: string[]): GroupedItems<T> {
  const subscribedBroads = new Set(subscribedCats.map(c => c.split(":")[0]?.trim() || c));
  const map = new Map<string, { icon: any; subs: Map<string, T[]> }>();
  for (const item of items) {
    const cat = getCat(item);
    const { broad, icon } = getCategoryGroup(cat);
    if (!subscribedBroads.has(broad)) continue;
    if (!map.has(broad)) map.set(broad, { icon, subs: new Map() });
    const subCat = cat.includes(":") ? cat.split(":").slice(1).join(":").trim() : null;
    const subKey = subCat || "__root__";
    const group = map.get(broad)!;
    if (!group.subs.has(subKey)) group.subs.set(subKey, []);
    group.subs.get(subKey)!.push(item);
  }
  const result: GroupedItems<T> = [];
  for (const [broad, { icon, subs }] of map.entries()) {
    const allItems: T[] = [];
    subs.forEach(items => allItems.push(...items));
    result.push({ broad, sub: null, icon, items: allItems });
  }
  return result;
}

function getSubGroups<T>(items: T[], getCat: (item: T) => string): { sub: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const cat = getCat(item);
    const sub = cat.includes(":") ? cat.split(":").slice(1).join(":").trim() : cat;
    if (!map.has(sub)) map.set(sub, []);
    map.get(sub)!.push(item);
  }
  return Array.from(map.entries()).map(([sub, items]) => ({ sub, items }));
}

const DEMO_JOB: Job = {
  id: "demo-tutorial-job",
  title: "🎓 Tutorial: Practice Sending a Quote",
  description: "This is a demo request! Practice sending a quote here — it won't affect your real data. Try setting a price, delivery time, and message. After quoting, you'll be taken to the Quotes Terminal where you can chat with the simulated buyer.",
  category: "Getting Started",
  subcategory: null,
  budget_max: 25,
  deadline_minutes: 1440,
  status: "open",
  created_at: new Date().toISOString(),
  expires_at: null,
  buyer_id: "demo-buyer",
};

const ExpertDashboard = ({ profile, subscribedCategories }: ExpertDashboardProps) => {
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [quotedJobIds, setQuotedJobIds] = useState<Set<string>>(new Set());
  const [discardedJobIds, setDiscardedJobIds] = useState<Set<string>>(new Set());
  const [discardConfirmJob, setDiscardConfirmJob] = useState<Job | null>(null);
  const [quoteDialog, setQuoteDialog] = useState<Job | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMinutes, setQuoteMinutes] = useState("20");
  const [quoteTimeUnit, setQuoteTimeUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { format } = useCurrency();
  const playNotificationSound = useNotificationSound();

  useEffect(() => {
    const fetchJobs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: jobs } = await supabase
        .from("jobs").select("*").eq("status", "open")
        .order("created_at", { ascending: false }).limit(20);
      const filtered = (jobs || []).filter(j => j.buyer_id !== profile?.id);
      setOpenJobs(filtered);
      setLoadingJobs(false);

      if (user && jobs && jobs.length > 0) {
        const jobIds = jobs.map(j => j.id);
        const { data: myQuotes } = await supabase.from("quotes").select("job_id").eq("expert_id", user.id).in("job_id", jobIds);
        if (myQuotes) setQuotedJobIds(new Set(myQuotes.map(q => q.job_id)));
      }
    };
    fetchJobs();

    const channel = supabase
      .channel("expert-new-jobs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jobs" }, (payload) => {
        const newJob = payload.new as Job;
        if (newJob.status === "open" && newJob.buyer_id !== profile?.id) {
          setOpenJobs((prev) => [newJob, ...prev]);
          playNotificationSound();
          toast({ title: "🔔 New request!", description: `"${newJob.title}" — €${newJob.budget_max}` });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: myQuotes } = await supabase.from("quotes").select("*").eq("expert_id", user.id).eq("status", "accepted");
      if (!myQuotes || myQuotes.length === 0) { setLoadingOrders(false); return; }

      const orderPromises = myQuotes.map(async (quote) => {
        const { data: job } = await supabase.from("jobs").select("*").eq("id", quote.job_id).single();
        let buyerProfile = null;
        if (job) {
          const { data: bp } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", job.buyer_id).single();
          buyerProfile = bp;
        }
        return { job, quote, buyerProfile };
      });

      const results = (await Promise.all(orderPromises)).filter(o => o.job);
      setOrders(results);
      setLoadingOrders(false);
    };
    fetchOrders();

    // Realtime: update expert orders when job status changes
    const ordersChannel = supabase
      .channel("expert-orders-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs" }, () => {
        fetchOrders();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(ordersChannel); };
  }, []);

  const handleSendQuote = async () => {
    if (!quoteDialog || !quotePrice) return;

    // Demo quote — don't hit the DB, just navigate to the demo quote terminal
    if (quoteDialog.id === "demo-tutorial-job") {
      const timeValue = parseInt(quoteMinutes);
      let estimatedMinutes = timeValue;
      if (quoteTimeUnit === "hours") estimatedMinutes = timeValue * 60;
      if (quoteTimeUnit === "days") estimatedMinutes = timeValue * 1440;

      // Store demo quote data in sessionStorage for the Quotes Terminal to pick up
      sessionStorage.setItem("demo_quote_data", JSON.stringify({
        price: parseFloat(quotePrice),
        estimated_minutes: estimatedMinutes,
        message: quoteMessage || null,
      }));
      
      toast({ title: "Demo quote sent! ✅", description: "Let's see it in the Quotes Terminal." });
      setQuoteDialog(null);
      setQuotePrice("");
      setQuoteMessage("");
      navigate("/quotes");
      return;
    }

    setSendingQuote(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const timeValue = parseInt(quoteMinutes);
    let estimatedMinutes = timeValue;
    if (quoteTimeUnit === "hours") estimatedMinutes = timeValue * 60;
    if (quoteTimeUnit === "days") estimatedMinutes = timeValue * 1440;

    const { data: quoteData, error } = await supabase.from("quotes").insert({
      job_id: quoteDialog.id,
      expert_id: session.user.id,
      price: parseFloat(quotePrice),
      estimated_minutes: estimatedMinutes,
      message: quoteMessage || null,
    }).select().single();

    if (error) {
      toast({ title: "Error sending quote", description: error.message, variant: "destructive" });
    } else {
      const { data: sessionData } = await supabase.from("sessions").insert({
        mentor_id: session.user.id,
        mentee_id: quoteDialog.buyer_id,
        status: "pending",
        issue_description: quoteDialog.title,
        categories: [quoteDialog.category],
        session_type: "chat",
      }).select().single();

      if (quoteMessage && sessionData) {
        await supabase.from("messages").insert({ session_id: sessionData.id, sender_id: session.user.id, content: quoteMessage });
      }

      setQuotedJobIds((prev) => new Set([...prev, quoteDialog.id]));
      toast({ title: "Quote sent! ✅", description: "View the leaderboard and chat with the buyer." });

      // Email buyer: new quote received (fire-and-forget)
      supabase.functions.invoke("send-order-email", {
        body: {
          event: "new_quote",
          jobId: quoteDialog.id,
          quote: { expert_id: session.user.id, price: parseFloat(quotePrice), estimated_minutes: estimatedMinutes },
        },
      }).catch(console.error);

      navigate(`/request/${quoteDialog.id}`);
    }

    setSendingQuote(false);
    setQuoteDialog(null);
    setQuotePrice("");
    setQuoteMessage("");
  };

  const ongoingOrders = orders.filter(o => o.job.status === "accepted");
  const completedOrders = orders.filter(o => o.job.status === "completed");
  const disputedOrders = orders.filter(o => o.job.status === "disputed");

  const ratingValue = profile?.rating_avg ? Number(profile.rating_avg) : 0;
  const ratingPercent = ratingValue > 0 ? Math.round((ratingValue / 5) * 100) : 0;

  const statCards = [
    { icon: <DollarSign className="h-5 w-5" />, value: format(profile?.wallet_balance || 0), label: "Earnings" },
    { icon: <Target className="h-5 w-5" />, value: profile?.total_sessions || 0, label: "Completed" },
    { icon: <Star className="h-5 w-5" />, value: ratingValue > 0 ? ratingValue.toFixed(1) : "—", label: "Rating" },
    { icon: <Zap className="h-5 w-5" />, value: subscribedCategories.length, label: "Categories" },
  ];

  const renderOrderCard = (order: OrderData) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
      accepted: { label: "Ongoing", variant: "default", icon: Clock },
      completed: { label: "Done", variant: "secondary", icon: CheckCircle2 },
      disputed: { label: "Disputed", variant: "destructive", icon: AlertTriangle },
    };
    const config = statusMap[order.job.status] || statusMap.accepted;
    const StatusIcon = config.icon;

    return (
      <button
        key={order.job.id}
        onClick={() => navigate(`/order/${order.job.id}`)}
        className="w-full text-left flex items-center gap-3 rounded-sm border border-border bg-background/40 p-3 cursor-pointer transition-all duration-200 hover:border-primary/20 hover:bg-primary/[0.03] active:scale-[0.99]"
      >
        <Avatar className="h-8 w-8 border border-border shrink-0 rounded-sm">
          <AvatarImage src={order.buyerProfile?.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {order.buyerProfile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate text-sm">{order.job.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {order.buyerProfile?.display_name || "Client"} · {format(Number(order.quote.price))}
          </p>
        </div>
        <Badge variant={config.variant} className="gap-1 shrink-0 text-[10px] px-1.5 py-0.5">
          <StatusIcon className="h-3 w-3" />
          <span className="hidden sm:inline">{config.label}</span>
        </Badge>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="text-center py-10 text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* ── Quote Dialog ── */}
      <Dialog open={!!quoteDialog} onOpenChange={() => setQuoteDialog(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border w-[calc(100vw-32px)] max-w-md mx-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Send Quote</DialogTitle>
            <DialogDescription className="text-xs">
              {quoteDialog?.title} — Budget: up to {format(quoteDialog?.budget_max || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Your Price (€)</label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 12"
                value={quotePrice}
                onChange={(e) => setQuotePrice(e.target.value)}
                min={1}
                max={quoteDialog?.budget_max}
                className="bg-background/60 border-border h-11 text-base"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Delivery Time</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={quoteMinutes}
                  onChange={(e) => setQuoteMinutes(e.target.value)}
                  min={1}
                  className="bg-background/60 border-border flex-1 h-11 text-base"
                />
                <Select value={quoteTimeUnit} onValueChange={(v: "minutes" | "hours" | "days") => setQuoteTimeUnit(v)}>
                  <SelectTrigger className="w-[110px] bg-background/60 border-border h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Min</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Message (optional)</label>
              <Textarea
                placeholder="I can fix this quickly because..."
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
                maxLength={500}
                className="bg-background/60 border-border text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setQuoteDialog(null)} className="border-border flex-1">Cancel</Button>
            <Button onClick={handleSendQuote} disabled={sendingQuote || !quotePrice} className="gap-2 shadow-glow flex-1">
              {sendingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Discard Confirmation ── */}
      <AlertDialog open={!!discardConfirmJob} onOpenChange={(open) => !open && setDiscardConfirmJob(null)}>
        <AlertDialogContent className="rounded-xl w-[calc(100vw-32px)] max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard request?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              "{discardConfirmJob?.title}" will be hidden from your feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (discardConfirmJob) setDiscardedJobIds(prev => new Set([...prev, discardConfirmJob.id]));
                setDiscardConfirmJob(null);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Job Preview Dialog ── */}
      <Dialog open={!!previewJob} onOpenChange={() => setPreviewJob(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border w-[calc(100vw-32px)] max-w-lg mx-auto rounded-xl overflow-hidden p-0">
          {/* Header band */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-start gap-3 pr-7">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground text-base leading-snug">{previewJob?.title}</h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {(() => {
                    const parts = (previewJob?.category || "").split(":");
                    const broad = parts[0]?.trim();
                    const sub = parts[1]?.trim();
                    return (
                      <>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{broad}</Badge>
                        {sub && <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-primary/25 text-primary/80">{sub}</Badge>}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Key specs grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-background/40 p-3 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Budget</p>
                <p className="text-lg font-bold text-primary">{previewJob ? `€${previewJob.budget_max}` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Maximum offered</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Max Delivery</p>
                <p className="text-lg font-bold text-foreground">{previewJob ? formatDeliveryTime(previewJob.deadline_minutes) : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Buyer's deadline</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description</p>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {previewJob?.description || <span className="text-muted-foreground italic">No description provided.</span>}
                </p>
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Posted {previewJob ? timeAgo(previewJob.created_at) : "—"} ago
              </span>
              {previewJob?.expires_at && (
                <span className="flex items-center gap-1 text-chart-4">
                  <Clock className="h-3 w-3" />
                  Expires {timeAgo(previewJob.expires_at)}
                </span>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 px-5 py-4 border-t border-border">
            <Button variant="ghost" onClick={() => setPreviewJob(null)} className="flex-1 border border-border">Dismiss</Button>
            {previewJob && !quotedJobIds.has(previewJob.id) && (
              <Button className="gap-1.5 flex-1 shadow-glow" onClick={() => {
                const job = previewJob;
                setPreviewJob(null);
                setQuoteDialog(job);
                setQuotePrice(String(Math.round(job.budget_max * 0.8)));
              }}>
                <Send className="h-3.5 w-3.5" /> Send Quote
              </Button>
            )}
            {previewJob && quotedJobIds.has(previewJob.id) && (
              <Button variant="outline" className="gap-1.5 flex-1 border-primary/30 text-primary" onClick={() => { navigate(`/request/${previewJob.id}`); setPreviewJob(null); }}>
                <MessageSquare className="h-3.5 w-3.5" /> Open Chat
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Stats — 2 cols mobile, 4 desktop ── */}
      <div id="tour-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border bg-card/60 backdrop-blur-xl transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5 animate-fade-in rounded-sm" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-sm bg-primary/[0.08] text-primary shrink-0">{stat.icon}</div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Replay tutorial */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={startSellerTutorial}>
          <Target className="h-3.5 w-3.5" /> Seller Basics Tutorial
        </Button>
      </div>

      {/* ── Main area — full width tabs + stacked sidebar ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:200ms] rounded-sm">
            <CardContent className="pt-4 px-2 sm:px-6">
              <Tabs defaultValue="live" className="space-y-3" id="tour-tabs">
                {/* Tabs — icon + short label on mobile, full on desktop */}
                <TabsList className="bg-background/60 border border-border w-full grid grid-cols-4 h-10">
                  <TabsTrigger value="live" className="gap-1 text-xs px-1">
                    <Bell className="h-3.5 w-3.5 shrink-0" />
                    <span>Live</span>
                    {openJobs.length > 0 && (
                      <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                        {openJobs.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="ongoing" className="gap-1 text-xs px-1">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Ongoing</span>
                    <span className="sm:hidden">Active</span>
                    {ongoingOrders.length > 0 && <span className="text-[9px] text-muted-foreground">({ongoingOrders.length})</span>}
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="gap-1 text-xs px-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Completed</span>
                    <span className="sm:hidden">Done</span>
                  </TabsTrigger>
                  <TabsTrigger value="disputed" className="gap-1 text-xs px-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Disputed</span>
                    <span className="sm:hidden">Issues</span>
                  </TabsTrigger>
                </TabsList>

                {/* Live Requests */}
                <TabsContent value="live" className="mt-0">
                  {loadingJobs ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
                  ) : (() => {
                    const visibleJobs = [...openJobs.filter(j => !discardedJobIds.has(j.id)), DEMO_JOB];
                    if (visibleJobs.length === 0) return (
                      <div className="text-center py-10 text-muted-foreground">
                        <div className="mx-auto mb-3 h-12 w-12 rounded-sm bg-primary/[0.06] flex items-center justify-center">
                          <Bell className="h-6 w-6 text-primary/40" />
                        </div>
                        <p className="font-medium text-foreground mb-1 text-sm">No open requests</p>
                        <p className="text-xs">New requests will appear here in real-time</p>
                      </div>
                    );
                    const grouped = groupByCategory(visibleJobs.slice(0, 10), j => j.category, subscribedCategories);
                    if (grouped.length === 0) return (
                      <div className="text-center py-10 text-muted-foreground">
                        <p className="text-sm">No requests matching your categories</p>
                      </div>
                    );
                    return (
                      <div className="space-y-1.5">
                        {grouped.map(({ broad, icon: CatIcon, items }) => (
                          <Collapsible key={broad} defaultOpen={grouped.length <= 3}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-sm px-2 py-2 hover:bg-primary/[0.04] transition-colors group">
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 shrink-0" />
                              <CatIcon className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm font-semibold text-foreground">{broad}</span>
                              <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-primary/[0.08] text-primary border-0">{items.length}</Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="space-y-1 pl-3 border-l border-border ml-4 mt-1 mb-2">
                                {getSubGroups(items, j => j.category).map(({ sub, items: subItems }) => (
                                  <div key={sub}>
                                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">{sub}</p>
                                    {subItems.map((job) => (
                                      <div
                                        key={job.id}
                                        className="flex items-center gap-2 rounded-sm border border-border bg-background/40 p-3 transition-all duration-200 hover:border-primary/20 hover:bg-primary/[0.03] mb-1.5"
                                      >
                                        {/* Info — tappable to preview */}
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewJob(job)}>
                                          <p className="font-medium text-foreground text-sm leading-snug line-clamp-1 hover:text-primary transition-colors">
                                            {job.title}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                            <span className="font-bold text-foreground">€{job.budget_max}</span>
                                            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3 text-primary/60" /> {formatDeliveryTime(job.deadline_minutes)}</span>
                                            <span>{timeAgo(job.created_at)}</span>
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          {quotedJobIds.has(job.id) ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 px-2.5 gap-1 rounded-sm border-primary/30 text-primary hover:bg-primary/10 text-xs"
                                              onClick={() => navigate(`/request/${job.id}`)}
                                            >
                                              <MessageSquare className="h-3 w-3" />
                                              <span className="hidden sm:inline">Chat</span>
                                            </Button>
                                          ) : (
                                            <>
                                              <Button
                                                size="sm"
                                                className="h-8 px-2.5 gap-1 rounded-sm text-xs"
                                                onClick={() => { setQuoteDialog(job); setQuotePrice(String(Math.round(job.budget_max * 0.8))); }}
                                              >
                                                <Send className="h-3 w-3" />
                                                <span className="hidden sm:inline">Quote</span>
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                onClick={() => setDiscardConfirmJob(job)}
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="ongoing" className="mt-0">
                  {loadingOrders ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
                    : ongoingOrders.length > 0 ? (
                      <div className="space-y-1.5">
                        {groupByCategory(ongoingOrders, o => o.job.category, subscribedCategories).map(({ broad, icon: CatIcon, items }) => (
                          <Collapsible key={broad} defaultOpen>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-sm px-2 py-2 hover:bg-primary/[0.04] transition-colors group">
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 shrink-0" />
                              <CatIcon className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm font-semibold text-foreground">{broad}</span>
                              <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-primary/[0.08] text-primary border-0">{items.length}</Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="space-y-1.5 pl-3 border-l border-border ml-4 mt-1 mb-2">
                                {items.map(renderOrderCard)}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    ) : renderEmptyState("No ongoing orders")}
                </TabsContent>

                <TabsContent value="completed" className="mt-0">
                  {loadingOrders ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
                    : completedOrders.length > 0 ? (
                      <div className="space-y-1.5">
                        {groupByCategory(completedOrders, o => o.job.category, subscribedCategories).map(({ broad, icon: CatIcon, items }) => (
                          <Collapsible key={broad} defaultOpen>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-sm px-2 py-2 hover:bg-primary/[0.04] transition-colors group">
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 shrink-0" />
                              <CatIcon className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm font-semibold text-foreground">{broad}</span>
                              <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-primary/[0.08] text-primary border-0">{items.length}</Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="space-y-1.5 pl-3 border-l border-border ml-4 mt-1 mb-2">
                                {items.map(renderOrderCard)}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    ) : renderEmptyState("No completed orders yet")}
                </TabsContent>

                <TabsContent value="disputed" className="mt-0">
                  {loadingOrders ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
                    : disputedOrders.length > 0 ? (
                      <div className="space-y-1.5">
                        {groupByCategory(disputedOrders, o => o.job.category, subscribedCategories).map(({ broad, icon: CatIcon, items }) => (
                          <Collapsible key={broad} defaultOpen>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-sm px-2 py-2 hover:bg-primary/[0.04] transition-colors group">
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 shrink-0" />
                              <CatIcon className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm font-semibold text-foreground">{broad}</span>
                              <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-primary/[0.08] text-primary border-0">{items.length}</Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="space-y-1.5 pl-3 border-l border-border ml-4 mt-1 mb-2">
                                {items.map(renderOrderCard)}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    ) : renderEmptyState("No disputed orders")}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar — stacks below on mobile ── */}
        <div className="space-y-4">
          <Card id="tour-categories" className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:300ms] rounded-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4">
              <CardTitle className="text-base">Your Categories</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" onClick={() => navigate("/settings")}>
                Edit
              </Button>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              {subscribedCategories.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {subscribedCategories.map((cat) => (
                    <span key={cat} className="rounded-sm border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                      {cat.replace(/^[^:]+:\s*/, "")}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 text-muted-foreground">
                  <p className="text-xs mb-2">Subscribe to categories to receive requests</p>
                  <Button variant="link" size="sm" className="text-primary h-auto p-0 text-xs" onClick={() => navigate("/settings")}>
                    Manage Categories
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="tour-quick-actions" className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:400ms] rounded-sm">
            <CardHeader className="pb-2 px-4"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4">
              <Button variant="outline" className="w-full justify-between border-border hover:bg-primary/[0.06] hover:border-primary/20 h-10 text-sm" onClick={() => navigate("/settings")}>
                Manage Categories <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-border hover:bg-primary/[0.06] hover:border-primary/20 h-10 text-sm" onClick={() => navigate("/wallet")}>
                View Earnings <DollarSign className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-border hover:bg-primary/[0.06] hover:border-primary/20 h-10 text-sm" onClick={() => navigate("/orders/sold")}>
                All Sold Orders <Package className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExpertDashboard;
