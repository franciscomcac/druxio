import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import TimezoneSelect from "@/components/settings/TimezoneSelect";
import AvailabilitySettings from "@/components/settings/AvailabilitySettings";
import {
  User, Bell, Shield, CreditCard, Loader2, Save, Camera, Clock, Tag, X,
} from "lucide-react";

const ALL_CATEGORIES = [
  "Gaming: Minecraft", "Gaming: Valorant", "Gaming: Fortnite", "Gaming: CS2", "Gaming: Apex",
  "Tech: Discord Bots", "Tech: Web Dev", "Tech: SEO", "Tech: Server Setup", "Tech: App Dev",
  "Business: Marketing", "Business: Startup", "Business: E-commerce", "Business: Accounting",
  "Creative: Design", "Creative: Video Editing", "Creative: Ad Copy", "Creative: Thumbnails",
  "Music: Production", "Music: Mixing", "Music: Guitar",
  "Fitness: Training", "Fitness: Nutrition",
  "Languages: English", "Languages: Spanish",
  "Content: Streaming", "Content: YouTube", "Content: TikTok",
];

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [isMentor, setIsMentor] = useState(false);
  const [subscribedCategories, setSubscribedCategories] = useState<string[]>([]);
  const [notifications, setNotifications] = useState({
    emailNewSession: true, emailMessages: true, emailMarketing: false, pushNotifications: true,
  });

  useEffect(() => { checkAuthAndFetch(); }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    setEmail(session.user.email || "");

    const [profileRes, rolesRes, catsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      supabase.from("expert_categories").select("category").eq("user_id", session.user.id),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (rolesRes.data?.some((r: any) => r.role === "mentor")) setIsMentor(true);
    setSubscribedCategories(catsRes.data?.map((c: any) => c.category) || []);
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: profile.display_name, bio: profile.bio, location: profile.location,
        timezone: profile.timezone, hourly_rate: profile.hourly_rate,
      }).eq("id", profile.id);
      if (error) throw error;
      toast({ title: "Settings saved", description: "Your profile has been updated." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleCategory = async (category: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (subscribedCategories.includes(category)) {
      await supabase.from("expert_categories").delete().eq("user_id", session.user.id).eq("category", category);
      setSubscribedCategories((prev) => prev.filter((c) => c !== category));
    } else {
      await supabase.from("expert_categories").insert({ user_id: session.user.id, category });
      setSubscribedCategories((prev) => [...prev, category]);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    try {
      const fileName = `${profile.id}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
      toast({ title: "Avatar updated" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="h-4 w-4" /> Profile</TabsTrigger>
            {isMentor && (
              <>
                <TabsTrigger value="categories" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Tag className="h-4 w-4" /> Categories</TabsTrigger>
                <TabsTrigger value="availability" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Clock className="h-4 w-4" /> Availability</TabsTrigger>
              </>
            )}
            <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
            <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="h-4 w-4" /> Security</TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><CreditCard className="h-4 w-4" /> Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-xl text-primary">{profile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "U"}</AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90">
                      <Camera className="h-4 w-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </label>
                  </div>
                  <div><h3 className="font-medium text-foreground">Profile Photo</h3><p className="text-sm text-muted-foreground">Click the camera icon to upload</p></div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Display Name</Label><Input value={profile?.display_name || ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={email} disabled /></div>
                  <div className="space-y-2"><Label>Location</Label><Input placeholder="City, Country" value={profile?.location || ""} onChange={(e) => setProfile({ ...profile, location: e.target.value })} /></div>
                  <TimezoneSelect value={profile?.timezone || "UTC"} onChange={(v) => setProfile({ ...profile, timezone: v })} />
                </div>

                <div className="space-y-2"><Label>Bio</Label><Textarea placeholder="Tell others about yourself..." className="min-h-32" value={profile?.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} /></div>

                <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {isMentor && (
            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Category Subscriptions</CardTitle>
                  <CardDescription>Select categories to receive real-time request notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-foreground mb-2">Your subscriptions ({subscribedCategories.length})</h4>
                    {subscribedCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {subscribedCategories.map((cat) => (
                          <Badge key={cat} variant="default" className="gap-1 cursor-pointer" onClick={() => toggleCategory(cat)}>
                            {cat} <X className="h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No categories selected yet</p>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-foreground mb-3">All categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {ALL_CATEGORIES.map((cat) => (
                      <Badge
                        key={cat}
                        variant={subscribedCategories.includes(cat) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        onClick={() => toggleCategory(cat)}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isMentor && profile && (
            <TabsContent value="availability">
              <AvailabilitySettings userId={profile.id} />
            </TabsContent>
          )}

          <TabsContent value="notifications">
            <Card>
              <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "emailNewSession", label: "New Requests", desc: "Get notified for new requests in your categories" },
                  { key: "emailMessages", label: "Messages", desc: "Get notified when you receive a message" },
                  { key: "pushNotifications", label: "Push Notifications", desc: "Browser push notifications" },
                  { key: "emailMarketing", label: "Marketing Emails", desc: "Updates about new features" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-accent/30">
                    <div><p className="font-medium text-foreground">{item.label}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                    <Switch checked={(notifications as any)[item.key]} onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-accent/30">
                  <h3 className="font-medium text-foreground mb-2">Change Password</h3>
                  <p className="text-sm text-muted-foreground mb-4">Keep your account secure</p>
                  <Button variant="outline">Change Password</Button>
                </div>
                <div className="p-4 rounded-lg border border-destructive/50">
                  <h3 className="font-medium text-destructive mb-2">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">Once deleted, there's no going back</p>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader><CardTitle>Billing & Payments</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-accent/30">
                  <h3 className="font-medium text-foreground mb-2">Payment Method</h3>
                  <p className="text-sm text-muted-foreground mb-4">No payment method on file</p>
                  <Button variant="outline" className="gap-2"><CreditCard className="h-4 w-4" /> Add Payment Method</Button>
                </div>
                {isMentor && (
                  <div className="p-4 rounded-lg bg-accent/30">
                    <h3 className="font-medium text-foreground mb-2">Payout Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">Set up Stripe Connect to receive payouts</p>
                    <Button variant="outline">Connect Stripe</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
