import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/Header";
import { 
  Target, MessageSquare, Video, DollarSign, Star, 
  Clock, TrendingUp, Users, Calendar, Settings,
  Plus, ArrowRight, LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  goals: any;
  rating_avg: number | null;
  total_sessions: number | null;
  wallet_balance: number | null;
  is_online: boolean | null;
}

interface UserRole {
  role: 'admin' | 'mentor' | 'mentee';
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'mentee' | 'mentor'>('mentee');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }

        // Fetch profile - handle case where it doesn't exist
        let { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        // If profile doesn't exist, create it
        if (!profileData && !profileError) {
          const displayName = session.user.user_metadata?.display_name || 
                              session.user.email?.split('@')[0] || 
                              'User';
          
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: session.user.id,
              display_name: displayName,
            })
            .select()
            .single();
          
          if (insertError) {
            console.error("Error creating profile:", insertError);
          } else {
            profileData = newProfile;
          }
        }

        if (profileError) {
          console.error("Profile error:", profileError);
        }
        
        setProfile(profileData);

        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        if (rolesError) {
          console.error("Roles error:", rolesError);
        }
        setRoles((rolesData as UserRole[]) || []);

        // Check if user is a mentor
        const isMentor = rolesData?.some(r => r.role === 'mentor');
        if (isMentor) {
          setActiveView('mentor');
        }
      } catch (error: any) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleBecomeMentor = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: session.user.id, role: 'mentor' });

      if (error) throw error;

      setRoles([...roles, { role: 'mentor' }]);
      toast({
        title: "You're now a mentor!",
        description: "Set up your availability to start helping others.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isMentor = roles.some(r => r.role === 'mentor');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {profile?.display_name?.split(" ").map(n => n[0]).join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome, {profile?.display_name || "User"}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {roles.map(r => (
                  <Badge key={r.role} variant="secondary" className="capitalize">
                    {r.role}
                  </Badge>
                ))}
                {profile?.is_online && (
                  <Badge variant="outline" className="gap-1 text-green-600">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Online
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {!isMentor && (
              <Button onClick={handleBecomeMentor} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Become a Mentor
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    ${profile?.wallet_balance?.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {profile?.total_sessions || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {profile?.rating_avg?.toFixed(1) || "0.0"}
                  </p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {profile?.goals?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Goals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role-specific tabs */}
        {isMentor && (
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'mentee' | 'mentor')} className="mb-8">
            <TabsList>
              <TabsTrigger value="mentee" className="gap-2">
                <Users className="h-4 w-4" />
                Mentee View
              </TabsTrigger>
              <TabsTrigger value="mentor" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Mentor View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Goals/Requests */}
          <div className="lg:col-span-2">
            {activeView === 'mentee' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Your Goals
                    </span>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add Goal
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Track your learning progress and achievements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profile?.goals && profile.goals.length > 0 ? (
                    <div className="space-y-4">
                      {profile.goals.map((goal: any, index: number) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-border p-4">
                          <div>
                            <p className="font-medium text-foreground">{goal.title}</p>
                            <p className="text-sm text-muted-foreground">{goal.progress}% complete</p>
                          </div>
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No goals yet. Add your first learning goal!</p>
                      <Button variant="outline" className="mt-4 gap-2">
                        <Plus className="h-4 w-4" />
                        Create Goal
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Session Requests
                  </CardTitle>
                  <CardDescription>
                    Incoming requests from mentees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending requests.</p>
                    <p className="text-sm mt-2">New requests will appear here when mentees reach out.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-between" onClick={() => navigate("/search")}>
                  Find a Mentor
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/wallet")}>
                  Top Up Wallet
                  <DollarSign className="h-4 w-4" />
                </Button>
                {isMentor && (
                  <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/settings")}>
                    Set Availability
                    <Calendar className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Skills</CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No skills added yet</p>
                    <Button variant="link" size="sm" className="mt-2">
                      Add Skills
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
