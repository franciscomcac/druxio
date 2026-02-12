import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import SellerConsentDialog from "@/components/onboarding/SellerConsentDialog";
import ClientDashboard from "@/components/dashboard/ClientDashboard";
import ExpertDashboard from "@/components/dashboard/ExpertDashboard";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Settings, LogOut, Loader2, Users, TrendingUp,
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
  const [activeView, setActiveView] = useState<"client" | "expert">("client");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSellerConsent, setShowSellerConsent] = useState(false);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [subscribedCategories, setSubscribedCategories] = useState<string[]>([]);
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
    if (isMentor) setActiveView("expert");

    setLoading(false);
  };

  const handleBecomeSeller = () => setShowSellerConsent(true);

  const handleSellerConsentAccept = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: session.user.id, role: "mentor" });
    if (error) throw error;
    setRoles([...roles, { role: "mentor" }]);
    setActiveView("expert");
    toast({ title: "Welcome, Expert! 🎉", description: "Subscribe to categories and start receiving requests." });
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    if (profile?.id) localStorage.setItem(`onboarding_completed_${profile.id}`, "true");
    fetchData();
  };

  const isMentor = roles.some((r: any) => r.role === "mentor");

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
                <Badge variant={activeView === "client" ? "default" : "secondary"}>
                  {activeView === "client" ? "Client" : "Expert"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* Role switcher */}
            {isMentor && (
              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button
                  variant={activeView === "client" ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 rounded-none"
                  onClick={() => setActiveView("client")}
                >
                  <Users className="h-4 w-4" /> Client
                </Button>
                <Button
                  variant={activeView === "expert" ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 rounded-none"
                  onClick={() => setActiveView("expert")}
                >
                  <TrendingUp className="h-4 w-4" /> Expert
                </Button>
              </div>
            )}
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

        {/* Render the appropriate dashboard */}
        {activeView === "client" ? (
          <ClientDashboard profile={profile} myJobs={myJobs} />
        ) : (
          <ExpertDashboard profile={profile} subscribedCategories={subscribedCategories} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
