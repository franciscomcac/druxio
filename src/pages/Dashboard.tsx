import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import SellerConsentDialog from "@/components/onboarding/SellerConsentDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, DollarSign, Star, Clock, TrendingUp, Users, Settings,
  Plus, ArrowRight, LogOut, Bell, Send, Loader2, Target
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

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"buyer" | "expert">("buyer");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSellerConsent, setShowSellerConsent] = useState(false);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [subscribedCategories, setSubscribedCategories] = useState<string[]>([]);
  const [quoteDialog, setQuoteDialog] = useState<Job | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMinutes, setQuoteMinutes] = useState("20");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const [profileRes, rolesRes, categoriesRes, myJobsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      supabase.from("expert_categories").select("category").eq("user_id", session.user.id),
      supabase.from("jobs").select("*").eq("buyer_id", session.user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (!profileRes.data) {
      const displayName = session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "User";
      const { data: newProfile } = await supabase.from("profiles").insert({ id: session.user.id, display_name: displayName }).select().single();
      setProfile(newProfile);
      const hasSeenOnboarding = localStorage.getItem(`onboarding_completed_${session.user.id}`);
      if (!hasSeenOnboarding) setShowOnboarding(true);
    } else {
      setProfile(profileRes.data);
      const hasCompleted = localStorage.getItem(`onboarding_completed_${session.user.id}`);
      if (!hasCompleted && !profileRes.data.skills?.length && !profileRes.data.bio) {
        const isMentorAlready = rolesRes.data?.some((r: any) => r.role === "mentor");
        if (!isMentorAlready) setShowOnboarding(true);
      }
    }

    setRoles(rolesRes.data || []);
    setSubscribedCategories(categoriesRes.data?.map((c: any) => c.category) || []);
    setMyJobs(myJobsRes.data || []);

    const isMentor = rolesRes.data?.some((r: any) => r.role === "mentor");
    if (isMentor) {
      setActiveView("expert");
      // Fetch open jobs matching subscribed categories
      const cats = categoriesRes.data?.map((c: any) => c.category) || [];
      if (cats.length > 0) {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(20);
        setOpenJobs(jobs || []);
      }
    }

    setLoading(false);
  };

  // Real-time subscription for new jobs (expert view)
  useEffect(() => {
    if (activeView !== "expert") return;

    const channel = supabase
      .channel("new-jobs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jobs" }, (payload) => {
        const newJob = payload.new as Job;
        if (newJob.status === "open") {
          setOpenJobs((prev) => [newJob, ...prev]);
          toast({ title: "🔔 New request!", description: `"${newJob.title}" — €${newJob.budget_max}` });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeView]);

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

  const handleBecomeSeller = () => setShowSellerConsent(true);

  const handleSellerConsentAccept = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: session.user.id, role: "mentor" });
    if (error) throw error;
    setRoles([...roles, { role: "mentor" }]);
    toast({ title: "Welcome, Expert! 🎉", description: "Subscribe to categories and start receiving requests." });
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    if (profile?.id) localStorage.setItem(`onboarding_completed_${profile.id}`, "true");
    fetchData();
  };

  const isMentor = roles.some((r: any) => r.role === "mentor");

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showOnboarding && profile && (
        <OnboardingWizard userId={profile.id} onComplete={handleOnboardingComplete} />
      )}
      <SellerConsentDialog open={showSellerConsent} onOpenChange={setShowSellerConsent} onAccept={handleSellerConsentAccept} />
      
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

      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {profile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome, {profile?.display_name || "User"}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {roles.map((r: any) => (
                  <Badge key={r.role} variant="secondary" className="capitalize">{r.role === "mentor" ? "expert" : r.role}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {!isMentor && (
              <Button onClick={handleBecomeSeller} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Become an Expert
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><DollarSign className="h-6 w-6" /></div><div><p className="text-2xl font-bold text-foreground">€{profile?.wallet_balance?.toFixed(2) || "0.00"}</p><p className="text-sm text-muted-foreground">Wallet</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Target className="h-6 w-6" /></div><div><p className="text-2xl font-bold text-foreground">{profile?.total_sessions || 0}</p><p className="text-sm text-muted-foreground">Completed Jobs</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Star className="h-6 w-6" /></div><div><p className="text-2xl font-bold text-foreground">{profile?.rating_avg?.toFixed(1) || "0.0"}</p><p className="text-sm text-muted-foreground">Rating</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary"><Zap className="h-6 w-6" /></div><div><p className="text-2xl font-bold text-foreground">{subscribedCategories.length}</p><p className="text-sm text-muted-foreground">Subscribed Categories</p></div></div></CardContent></Card>
        </div>

        {/* View Toggle */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="mb-8">
          <TabsList>
            <TabsTrigger value="buyer" className="gap-2"><Users className="h-4 w-4" /> Buyer</TabsTrigger>
            {isMentor && <TabsTrigger value="expert" className="gap-2"><TrendingUp className="h-4 w-4" /> Expert</TabsTrigger>}
          </TabsList>
        </Tabs>

        {activeView === "buyer" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Your Requests</span>
                    <Button size="sm" className="gap-1" onClick={() => navigate("/post-request")}>
                      <Plus className="h-4 w-4" /> New Request
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myJobs.length > 0 ? (
                    <div className="space-y-3">
                      {myJobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                          <div>
                            <p className="font-medium text-foreground">{job.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">{job.category}</Badge>
                              <span>€{job.budget_max}</span>
                              <span>{timeAgo(job.created_at)}</span>
                            </div>
                          </div>
                          <Badge variant={job.status === "open" ? "default" : "secondary"} className="capitalize">{job.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No requests yet</p>
                      <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/post-request")}>
                        <Plus className="h-4 w-4" /> Post Your First Request
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-between" onClick={() => navigate("/post-request")}>
                  Post a Request <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/wallet")}>
                  Top Up Wallet <DollarSign className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
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
                  {openJobs.length > 0 ? (
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
        )}
      </main>
    </div>
  );
};

export default Dashboard;
