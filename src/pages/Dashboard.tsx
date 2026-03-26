import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/use-seo";
import RankBadge from "@/components/RankBadge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import SellerConsentDialog from "@/components/onboarding/SellerConsentDialog";
import SellerSetupWizard from "@/components/onboarding/SellerSetupWizard";
import { startSellerTutorial } from "@/components/onboarding/SellerTutorial";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import ExpertDashboard from "@/components/dashboard/ExpertDashboard";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Settings, LogOut, Loader2, Users, TrendingUp, Sparkles,
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
  useSEO({ title: "Dashboard", noIndex: true });
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"client" | "expert">("client");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSellerConsent, setShowSellerConsent] = useState(false);
  
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [subscribedCategories, setSubscribedCategories] = useState<string[]>([]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const fetchData = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const [profileRes, rolesRes, categoriesRes, myJobsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("expert_categories").select("category").eq("user_id", userId),
        supabase.from("jobs").select("*").eq("buyer_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);

      let resolvedProfile = profileRes.data;
      let userRoles = rolesRes.data || [];

      // Ensure profile exists (fallback for accounts created before trigger was set up)
      if (!resolvedProfile) {
        const displayName =
          session.user?.user_metadata?.display_name ||
          session.user?.user_metadata?.full_name ||
          session.user?.email?.split("@")[0] ||
          "User";
        const { data: upserted } = await supabase
          .from("profiles")
          .upsert({ id: userId, display_name: displayName }, { onConflict: "id" })
          .select()
          .single();
        resolvedProfile = upserted;
      }

      // Ensure role exists (fallback for accounts created before trigger was set up)
      if (userRoles.length === 0) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "mentee" });
        if (!roleErr) userRoles = [{ role: "mentee" }];
        // If insert errored it likely already exists — re-fetch
        if (roleErr) {
          const { data: refetched } = await supabase.from("user_roles").select("role").eq("user_id", userId);
          userRoles = refetched || [];
        }
      }

      setProfile(resolvedProfile);
      setRoles(userRoles);
      setSubscribedCategories(categoriesRes.data?.map((c: any) => c.category) || []);
      setMyJobs(myJobsRes.data || []);

      const isMentorAlready = userRoles.some((r: any) => r.role === "mentor");
      if (isMentorAlready) setActiveView("expert");

      // Show onboarding for new accounts that haven't completed it
      const hasCompleted = localStorage.getItem(`onboarding_completed_${userId}`);
      if (!hasCompleted && !isMentorAlready) {
        if (!resolvedProfile?.skills?.length && !resolvedProfile?.bio) {
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error("Dashboard fetchData error:", error);
      toast({ title: "Error loading dashboard", description: "Please refresh the page.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchData(session.user.id);

      // Realtime: update dashboard when jobs or quotes change
      realtimeChannel = supabase
        .channel("dashboard-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `buyer_id=eq.${session.user.id}` }, () => {
          if (isMounted) fetchData(session.user.id);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes" }, () => {
          if (isMounted) fetchData(session.user.id);
        })
        .subscribe();
    });

    // Only listen for sign-out events (not initial load — that's handled above)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') navigate("/");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // Auto-open seller consent when redirected from "Join as Expert"
  useEffect(() => {
    if (searchParams.get("become_expert") === "1" && !loading && profile && !roles.some(r => r.role === "mentor")) {
      setShowSellerConsent(true);
      searchParams.delete("become_expert");
      setSearchParams(searchParams, { replace: true });
    }
  }, [loading, profile, roles, searchParams]);

  const handleBecomeSeller = () => setShowSellerConsent(true);

  const handleSellerConsentAccept = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: session.user.id, role: "mentor" });
    if (error) throw error;
    setRoles([...roles, { role: "mentor" }]);
    setActiveView("expert");
    setTimeout(() => startSellerTutorial(), 500);
    toast({ title: "Welcome, Expert! 🎉", description: "Subscribe to categories and start receiving requests." });
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    const userId = profile?.id;
    if (userId) {
      localStorage.setItem(`onboarding_completed_${userId}`, "true");
      await fetchData(userId);
    }
    // Clear any stale redirect that might send them away from dashboard
    localStorage.removeItem("post_request_pending");
  };

  const isMentor = roles.some((r: any) => r.role === "mentor");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const initials = profile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "U";

  return (
    <div className="min-h-screen bg-background">
      {showOnboarding && profile && (
        <OnboardingWizard userId={profile.id} onComplete={handleOnboardingComplete} />
      )}
      <SellerConsentDialog open={showSellerConsent} onOpenChange={setShowSellerConsent} onAccept={handleSellerConsentAccept} />




      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 max-w-7xl">
        {/* ── Profile Header ── */}
        <div className="mb-6 sm:mb-10 animate-fade-in">
          {/* Top row: avatar + name + icon actions */}
          <div className="flex items-center gap-3 sm:gap-5 mb-4">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 ring-primary/20 shadow-glow shrink-0">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                Welcome back, {profile?.display_name || "User"}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={`text-xs border-primary/20 ${activeView === "client" ? "bg-primary/[0.08] text-primary" : "text-muted-foreground"}`}>
                  {activeView === "client" ? "Client" : "Expert"}
                </Badge>
                <RankBadge totalSpent={profile?.total_spent || 0} />
              </div>
            </div>

            {/* Icon-only actions — always visible */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="icon" onClick={() => navigate("/settings")} className="h-9 w-9 border-border/30 hover:bg-primary/[0.06]">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bottom row: view toggle + become expert — full width on mobile */}
          <div className="flex items-center gap-2 flex-wrap">
            {isMentor && (
              <div id="tour-view-toggle" className="flex rounded-xl border border-border/30 overflow-hidden bg-card/40 backdrop-blur-sm">
                <Button
                  variant={activeView === "client" ? "default" : "ghost"}
                  size="sm"
                  className={`gap-1.5 rounded-none text-sm px-4 h-9 ${activeView === "client" ? "shadow-glow" : "hover:bg-primary/[0.06]"}`}
                  onClick={() => setActiveView("client")}
                >
                  <Users className="h-3.5 w-3.5" /> Client
                </Button>
                <Button
                  variant={activeView === "expert" ? "default" : "ghost"}
                  size="sm"
                  className={`gap-1.5 rounded-none text-sm px-4 h-9 ${activeView === "expert" ? "shadow-glow" : "hover:bg-primary/[0.06]"}`}
                  onClick={() => setActiveView("expert")}
                >
                  <TrendingUp className="h-3.5 w-3.5" /> Expert
                </Button>
              </div>
            )}
            {!isMentor && (
              <Button onClick={handleBecomeSeller} variant="outline" size="sm" className="gap-1.5 border-primary/20 hover:bg-primary/[0.06] h-9">
                <Sparkles className="h-3.5 w-3.5" /> Become an Expert
              </Button>
            )}
          </div>
        </div>

        {activeView === "client" ? (
          <ClientDashboard profile={profile} myJobs={myJobs} onJobsChanged={() => profile?.id && fetchData(profile.id)} />
        ) : (
          <ExpertDashboard profile={profile} subscribedCategories={subscribedCategories} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
