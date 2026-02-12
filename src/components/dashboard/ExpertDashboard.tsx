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
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20);
      setOpenJobs(jobs || []);
      setLoadingJobs(false);
    };
    fetchJobs();

    // Real-time subscription for new jobs
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

    const { error } = await supabase.from("quotes").insert({
      job_id: quoteDialog.id,
      expert_id: session.user.id,
      price: parseFloat(quotePrice),
      estimated_minutes: parseInt(quoteMinutes),
      message: quoteMessage || null,
    });

    if (error) {
      toast({ title: "Error sending quote", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Quote sent! ✅", description: "The buyer will see your offer." });
      setOpenJobs((prev) => prev.filter((j) => j.id !== quoteDialog.id));
    }

    setSendingQuote(false);
    setQuoteDialog(null);
    setQuotePrice("");
    setQuoteMessage("");
  };

  return (
    <div className="space-y-8">
      {/* Quote Dialog */}
      <Dialog open={!!quoteDialog} onOpenChange={() => setQuoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
            <DialogDescription>
              {quoteDialog?.title} — Budget: up to €{quoteDialog?.budget_max}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Price (€)</label>
              <Input type="number" placeholder="e.g. 12" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} min={1} max={quoteDialog?.budget_max} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estimated Time (min)</label>
              <Input type="number" value={quoteMinutes} onChange={(e) => setQuoteMinutes(e.target.value)} min={5} max={120} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Message (optional)</label>
              <Textarea placeholder="I can fix this quickly because..." value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialog(null)}>Cancel</Button>
            <Button onClick={handleSendQuote} disabled={sendingQuote || !quotePrice} className="gap-2">
              {sendingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><DollarSign className="h-6 w-6" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">€{profile?.wallet_balance?.toFixed(2) || "0.00"}</p>
                <p className="text-sm text-muted-foreground">Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Target className="h-6 w-6" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{profile?.total_sessions || 0}</p>
                <p className="text-sm text-muted-foreground">Jobs Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Star className="h-6 w-6" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{profile?.rating_avg?.toFixed(1) || "0.0"}</p>
                <p className="text-sm text-muted-foreground">Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Zap className="h-6 w-6" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{subscribedCategories.length}</p>
                <p className="text-sm text-muted-foreground">Subscribed Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Live Requests
              </CardTitle>
              <CardDescription>Open requests matching your categories — send a quote to get hired</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : openJobs.length > 0 ? (
                <div className="space-y-3">
                  {openJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-4 transition-all hover:bg-accent/30">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{job.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{job.category}</Badge>
                          <span className="font-semibold text-foreground">€{job.budget_max}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.deadline_minutes}min</span>
                          <span>{timeAgo(job.created_at)}</span>
                        </div>
                      </div>
                      <Button size="sm" className="gap-1" onClick={() => { setQuoteDialog(job); setQuotePrice(String(Math.round(job.budget_max * 0.8))); }}>
                        <Send className="h-3 w-3" /> Quote
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No open requests right now</p>
                  <p className="text-sm mt-2">New requests will appear here in real-time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Your Categories</CardTitle></CardHeader>
            <CardContent>
              {subscribedCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {subscribedCategories.map((cat) => (
                    <Badge key={cat} variant="secondary">{cat}</Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Subscribe to categories in Settings to receive requests</p>
                  <Button variant="link" size="sm" className="mt-2" onClick={() => navigate("/settings")}>
                    Manage Categories
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/settings")}>
                Manage Categories <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/wallet")}>
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
