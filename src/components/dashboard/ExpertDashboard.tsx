import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Star, Clock, Bell, Send, Loader2, Settings, Target, TrendingUp, Zap,
} from "lucide-react";

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

const ExpertDashboard = ({ profile, subscribedCategories }: ExpertDashboardProps) => {
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [quoteDialog, setQuoteDialog] = useState<Job | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMinutes, setQuoteMinutes] = useState("20");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchJobs = async () => {
      const { data: jobs } = await supabase
        .from("jobs").select("*").eq("status", "open")
        .order("created_at", { ascending: false }).limit(20);
      setOpenJobs(jobs || []);
      setLoadingJobs(false);
    };
    fetchJobs();

    const channel = supabase
      .channel("expert-new-jobs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jobs" }, (payload) => {
        const newJob = payload.new as Job;
        if (newJob.status === "open") {
          setOpenJobs((prev) => [newJob, ...prev]);
          toast({ title: "🔔 New request!", description: `"${newJob.title}" — €${newJob.budget_max}` });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSendQuote = async () => {
    if (!quoteDialog || !quotePrice) return;
    setSendingQuote(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: quoteData, error } = await supabase.from("quotes").insert({
      job_id: quoteDialog.id,
      expert_id: session.user.id,
      price: parseFloat(quotePrice),
      estimated_minutes: parseInt(quoteMinutes),
      message: quoteMessage || null,
    }).select().single();

    if (error) {
      toast({ title: "Error sending quote", description: error.message, variant: "destructive" });
    } else {
      // Create a pending session so both buyer and expert can chat
      const { data: sessionData } = await supabase.from("sessions").insert({
        mentor_id: session.user.id,
        mentee_id: quoteDialog.buyer_id,
        status: "pending",
        issue_description: quoteDialog.title,
        categories: [quoteDialog.category],
        session_type: "chat",
      }).select().single();

      // If expert included a message, insert it as first chat message
      if (quoteMessage && sessionData) {
        await supabase.from("messages").insert({
          session_id: sessionData.id,
          sender_id: session.user.id,
          content: quoteMessage,
        });
      }

      toast({ title: "Quote sent! ✅", description: "The buyer will see your offer and you can chat." });
      setOpenJobs((prev) => prev.filter((j) => j.id !== quoteDialog.id));
    }

    setSendingQuote(false);
    setQuoteDialog(null);
    setQuotePrice("");
    setQuoteMessage("");
  };

  const statCards = [
    { icon: <DollarSign className="h-6 w-6" />, value: `€${profile?.wallet_balance?.toFixed(2) || "0.00"}`, label: "Earnings" },
    { icon: <Target className="h-6 w-6" />, value: profile?.total_sessions || 0, label: "Jobs Completed" },
    { icon: <Star className="h-6 w-6" />, value: profile?.rating_avg?.toFixed(1) || "0.0", label: "Rating" },
    { icon: <Zap className="h-6 w-6" />, value: subscribedCategories.length, label: "Subscribed Categories" },
  ];

  return (
    <div className="space-y-8">
      {/* Quote Dialog */}
      <Dialog open={!!quoteDialog} onOpenChange={() => setQuoteDialog(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
            <DialogDescription>
              {quoteDialog?.title} — Budget: up to €{quoteDialog?.budget_max}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Price (€)</label>
              <Input type="number" placeholder="e.g. 12" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} min={1} max={quoteDialog?.budget_max} className="bg-background/60 border-border/40" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estimated Time (min)</label>
              <Input type="number" value={quoteMinutes} onChange={(e) => setQuoteMinutes(e.target.value)} min={5} max={120} className="bg-background/60 border-border/40" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Message (optional)</label>
              <Textarea placeholder="I can fix this quickly because..." value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} maxLength={500} className="bg-background/60 border-border/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialog(null)} className="border-border/30">Cancel</Button>
            <Button onClick={handleSendQuote} disabled={sendingQuote || !quotePrice} className="gap-2 shadow-glow">
              {sendingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/30 bg-card/60 backdrop-blur-xl transition-all duration-500 hover:shadow-glow hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">{stat.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/30 bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:300ms]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="relative">
                      <Bell className="h-5 w-5 text-primary" />
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-ping" />
                    </div>
                    Live Requests
                  </CardTitle>
                  <CardDescription className="mt-1">Open requests matching your categories</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/60" /></div>
              ) : openJobs.length > 0 ? (
                <div className="space-y-3">
                  {openJobs.map((job, i) => (
                    <div key={job.id} className="flex items-center justify-between rounded-xl border border-border/20 bg-background/40 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-primary/[0.03] animate-fade-in" style={{ animationDelay: `${(i + 4) * 60}ms` }}>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{job.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs border-primary/20 text-primary/80">{job.category}</Badge>
                          <span className="font-bold text-foreground">€{job.budget_max}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary/60" /> {job.deadline_minutes}min</span>
                          <span>{timeAgo(job.created_at)}</span>
                        </div>
                      </div>
                      <Button size="sm" className="gap-1.5 shadow-glow hover:shadow-glow-lg transition-shadow" onClick={() => { setQuoteDialog(job); setQuotePrice(String(Math.round(job.budget_max * 0.8))); }}>
                        <Send className="h-3 w-3" /> Quote
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/[0.06] flex items-center justify-center">
                    <Bell className="h-7 w-7 text-primary/40" />
                  </div>
                  <p className="font-medium text-foreground mb-1">No open requests right now</p>
                  <p className="text-sm">New requests will appear here in real-time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/30 bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:400ms]">
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

          <Card className="border-border/30 bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:500ms]">
            <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between border-border/30 hover:bg-primary/[0.06] hover:border-primary/20" onClick={() => navigate("/settings")}>
                Manage Categories <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-border/30 hover:bg-primary/[0.06] hover:border-primary/20" onClick={() => navigate("/wallet")}>
                View Earnings <DollarSign className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExpertDashboard;
