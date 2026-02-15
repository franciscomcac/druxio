import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DollarSign, Star, Clock, Bell, Send, Loader2, Settings, Target, TrendingUp, Zap, MessageSquare,
  Package, CheckCircle2, AlertTriangle, ArrowRight, X, ChevronRight, FolderOpen,
  Gamepad2, Code, Briefcase, Palette, Music, Dumbbell, Globe, Video,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  title: string;
  description: string | null;
  category: string;
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

const timeAgo = (date: string) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
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

function groupByCategory<T>(
  items: T[],
  getCat: (item: T) => string,
  subscribedCats: string[]
): GroupedItems<T> {
  // Build set of subscribed broad categories
  const subscribedBroads = new Set(subscribedCats.map(c => c.split(":")[0]?.trim() || c));
  
  const map = new Map<string, { icon: any; subs: Map<string, T[]> }>();
  for (const item of items) {
    const cat = getCat(item);
    const { broad, icon } = getCategoryGroup(cat);
    // Only include items whose broad category the seller is subscribed to
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

  // Orders state
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch open jobs
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
        const { data: myQuotes } = await supabase
          .from("quotes")
          .select("job_id")
          .eq("expert_id", user.id)
          .in("job_id", jobIds);
        if (myQuotes) {
          setQuotedJobIds(new Set(myQuotes.map(q => q.job_id)));
        }
      }
    };
    fetchJobs();

    const channel = supabase
      .channel("expert-new-jobs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jobs" }, (payload) => {
        const newJob = payload.new as Job;
        if (newJob.status === "open" && newJob.buyer_id !== profile?.id) {
          setOpenJobs((prev) => [newJob, ...prev]);
          toast({ title: "🔔 New request!", description: `"${newJob.title}" — €${newJob.budget_max}` });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch expert's orders (jobs where expert has an accepted quote)
  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myQuotes } = await supabase
        .from("quotes")
        .select("*")
        .eq("expert_id", user.id)
        .eq("status", "accepted");

      if (!myQuotes || myQuotes.length === 0) {
        setLoadingOrders(false);
        return;
      }

      const orderPromises = myQuotes.map(async (quote) => {
        const { data: job } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", quote.job_id)
          .single();

        let buyerProfile = null;
        if (job) {
          const { data: bp } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", job.buyer_id)
            .single();
          buyerProfile = bp;
        }

        return { job, quote, buyerProfile };
      });

      const results = (await Promise.all(orderPromises)).filter(o => o.job);
      setOrders(results);
      setLoadingOrders(false);
    };
    fetchOrders();
  }, []);

  const handleSendQuote = async () => {
    if (!quoteDialog || !quotePrice) return;
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
        await supabase.from("messages").insert({
          session_id: sessionData.id,
          sender_id: session.user.id,
          content: quoteMessage,
        });
      }

      setQuotedJobIds((prev) => new Set([...prev, quoteDialog.id]));
      toast({ title: "Quote sent! ✅", description: "View the leaderboard and chat with the buyer." });
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
    { icon: <DollarSign className="h-6 w-6" />, value: `€${profile?.wallet_balance?.toFixed(2) || "0.00"}`, label: "Earnings", subtitle: null },
    { icon: <Target className="h-6 w-6" />, value: profile?.total_sessions || 0, label: "Jobs Completed", subtitle: null },
    { icon: <Star className="h-6 w-6" />, value: ratingValue.toFixed(1), label: "Rating", subtitle: ratingValue > 0 ? `${ratingPercent}% satisfaction` : null },
    { icon: <Zap className="h-6 w-6" />, value: subscribedCategories.length, label: "Categories", subtitle: null },
  ];

  const renderOrderCard = (order: OrderData) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
      accepted: { label: "Ongoing", variant: "default", icon: Clock },
      completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
      disputed: { label: "Disputed", variant: "destructive", icon: AlertTriangle },
    };
    const config = statusMap[order.job.status] || statusMap.accepted;
    const StatusIcon = config.icon;

    return (
      <div
        key={order.job.id}
        onClick={() => navigate(`/order/${order.job.id}`)}
        className="flex items-center justify-between rounded-sm border border-border bg-background/40 p-4 cursor-pointer transition-all duration-200 hover:border-primary/20 hover:bg-primary/[0.03]"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-9 w-9 border border-border shrink-0 rounded-sm">
            <AvatarImage src={order.buyerProfile?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {order.buyerProfile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{order.job.title}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{order.buyerProfile?.display_name || "Client"}</span>
              <span>·</span>
              <span>€{Number(order.quote.price).toFixed(2)}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(order.job.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={config.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="text-center py-10 text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Quote Dialog */}
      <Dialog open={!!quoteDialog} onOpenChange={() => setQuoteDialog(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
            <DialogDescription>
              {quoteDialog?.title} — Budget: up to €{quoteDialog?.budget_max}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Price (€)</label>
              <Input type="number" placeholder="e.g. 12" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} min={1} max={quoteDialog?.budget_max} className="bg-background/60 border-border" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estimated Delivery Time</label>
              <div className="flex gap-2">
                <Input type="number" value={quoteMinutes} onChange={(e) => setQuoteMinutes(e.target.value)} min={1} className="bg-background/60 border-border flex-1" />
                <Select value={quoteTimeUnit} onValueChange={(v: "minutes" | "hours" | "days") => setQuoteTimeUnit(v)}>
                  <SelectTrigger className="w-[120px] bg-background/60 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Message (optional)</label>
              <Textarea placeholder="I can fix this quickly because..." value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} maxLength={500} className="bg-background/60 border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialog(null)} className="border-border">Cancel</Button>
            <Button onClick={handleSendQuote} disabled={sendingQuote || !quotePrice} className="gap-2 shadow-glow">
              {sendingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Confirmation */}
      <AlertDialog open={!!discardConfirmJob} onOpenChange={(open) => !open && setDiscardConfirmJob(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this request?</AlertDialogTitle>
            <AlertDialogDescription>
              "{discardConfirmJob?.title}" will be hidden from your feed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (discardConfirmJob) {
                setDiscardedJobIds(prev => new Set([...prev, discardConfirmJob.id]));
              }
              setDiscardConfirmJob(null);
            }}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border bg-card/60 backdrop-blur-xl transition-all duration-300 hover:shadow-glow hover:-translate-y-1 animate-fade-in rounded-sm" style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-primary/[0.08] text-primary">{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {stat.subtitle && <p className="text-xs text-primary mt-0.5">{stat.subtitle}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content with Tabs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:300ms] rounded-sm">
            <CardContent className="pt-6">
              <Tabs defaultValue="live" className="space-y-4">
                <TabsList className="bg-background/60 border border-border w-full justify-start">
                  <TabsTrigger value="live" className="gap-1.5 relative">
                    <Bell className="h-3.5 w-3.5" /> Live
                    {openJobs.length > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {openJobs.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="ongoing" className="gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Ongoing
                    {ongoingOrders.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">({ongoingOrders.length})</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    {completedOrders.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">({completedOrders.length})</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="disputed" className="gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Disputed
                    {disputedOrders.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">({disputedOrders.length})</span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Live Requests */}
                <TabsContent value="live" className="mt-0">
                  {loadingJobs ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
                  ) : (() => {
                    const visibleJobs = openJobs.filter(j => !discardedJobIds.has(j.id));
                    if (visibleJobs.length === 0) return (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="mx-auto mb-4 h-16 w-16 rounded-sm bg-primary/[0.06] flex items-center justify-center">
                          <Bell className="h-7 w-7 text-primary/40" />
                        </div>
                        <p className="font-medium text-foreground mb-1">No open requests right now</p>
                        <p className="text-sm">New requests will appear here in real-time</p>
                      </div>
                    );
                    const grouped = groupByCategory(visibleJobs.slice(0, 10), j => j.category, subscribedCategories);
                    if (grouped.length === 0) return (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No requests matching your subscribed categories</p>
                      </div>
                    );
                    return (
                      <div className="space-y-2">
                        {grouped.map(({ broad, icon: CatIcon, items }) => (
                          <Collapsible key={broad} defaultOpen={grouped.length <= 3}>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-sm px-3 py-2.5 hover:bg-primary/[0.04] transition-colors group">
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                              <CatIcon className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold text-foreground">{broad}</span>
                              <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-primary/[0.08] text-primary border-0">{items.length}</Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="space-y-1.5 pl-4 border-l border-border ml-4 mt-1 mb-2">
                                {getSubGroups(items, j => j.category).map(({ sub, items: subItems }) => (
                                  <div key={sub}>
                                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">{sub}</p>
                                    {subItems.map((job) => (
                                      <div key={job.id} className="flex items-center justify-between rounded-sm border border-border bg-background/40 p-4 transition-all duration-200 hover:border-primary/20 hover:bg-primary/[0.03]">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-foreground truncate">{job.title}</p>
                                          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                            <span className="font-bold text-foreground">€{job.budget_max}</span>
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary/60" /> {job.deadline_minutes}min</span>
                                            <span>{timeAgo(job.created_at)}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {quotedJobIds.has(job.id) ? (
                                            <Button size="sm" variant="outline" className="gap-1.5 rounded-sm border-primary/30 text-primary hover:bg-primary/10" onClick={() => navigate(`/request/${job.id}`)}>
                                              <MessageSquare className="h-3 w-3" /> Chat
                                            </Button>
                                          ) : (
                                            <>
                                              <Button size="sm" className="gap-1.5 rounded-sm" onClick={() => { setQuoteDialog(job); setQuotePrice(String(Math.round(job.budget_max * 0.8))); }}>
                                                <Send className="h-3 w-3" /> Quote
                                              </Button>
                                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDiscardConfirmJob(job)} title="Discard">
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

                {/* Ongoing Orders */}
                <TabsContent value="ongoing" className="mt-0">
                  {loadingOrders ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
                  ) : ongoingOrders.length > 0 ? (
                    <div className="space-y-2">
                      {groupByCategory(ongoingOrders, o => o.job.category, subscribedCategories).map(({ broad, icon: CatIcon, items }) => (
                        <Collapsible key={broad} defaultOpen>
                          <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-sm px-3 py-2.5 hover:bg-primary/[0.04] transition-colors group">
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                            <CatIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">{broad}</span>
                            <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-primary/[0.08] text-primary border-0">{items.length}</Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 pl-4 border-l border-border ml-4 mt-1 mb-2">
                              {items.map(renderOrderCard)}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  ) : renderEmptyState("No ongoing orders")}
                </TabsContent>

                {/* Completed Orders */}
                <TabsContent value="completed" className="mt-0">
                  {loadingOrders ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
                  ) : completedOrders.length > 0 ? (
                    <div className="space-y-2">
                      {groupByCategory(completedOrders, o => o.job.category, subscribedCategories).map(({ broad, icon: CatIcon, items }) => (
                        <Collapsible key={broad} defaultOpen>
                          <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-sm px-3 py-2.5 hover:bg-primary/[0.04] transition-colors group">
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                            <CatIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">{broad}</span>
                            <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-primary/[0.08] text-primary border-0">{items.length}</Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 pl-4 border-l border-border ml-4 mt-1 mb-2">
                              {items.map(renderOrderCard)}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  ) : renderEmptyState("No completed orders yet")}
                </TabsContent>

                {/* Disputed Orders */}
                <TabsContent value="disputed" className="mt-0">
                  {loadingOrders ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
                  ) : disputedOrders.length > 0 ? (
                    <div className="space-y-2">
                      {groupByCategory(disputedOrders, o => o.job.category, subscribedCategories).map(({ broad, icon: CatIcon, items }) => (
                        <Collapsible key={broad} defaultOpen>
                          <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-sm px-3 py-2.5 hover:bg-primary/[0.04] transition-colors group">
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                            <CatIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">{broad}</span>
                            <Badge variant="secondary" className="ml-auto text-[10px] h-5 bg-primary/[0.08] text-primary border-0">{items.length}</Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 pl-4 border-l border-border ml-4 mt-1 mb-2">
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

        <div className="space-y-6">
          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:400ms] rounded-sm">
            <CardHeader><CardTitle className="text-lg">Your Categories</CardTitle></CardHeader>
            <CardContent>
              {subscribedCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {subscribedCategories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="bg-primary/[0.08] text-primary border-primary/20">{cat}</Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm mb-2">Subscribe to categories to receive requests</p>
                  <Button variant="link" size="sm" className="text-primary" onClick={() => navigate("/settings")}>
                    Manage Categories
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:500ms] rounded-sm">
            <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between border-border hover:bg-primary/[0.06] hover:border-primary/20" onClick={() => navigate("/settings")}>
                Manage Categories <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-border hover:bg-primary/[0.06] hover:border-primary/20" onClick={() => navigate("/wallet")}>
                View Earnings <DollarSign className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-border hover:bg-primary/[0.06] hover:border-primary/20" onClick={() => navigate("/orders/sold")}>
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
