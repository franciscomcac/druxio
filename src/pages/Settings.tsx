import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import PortfolioSection from "@/components/experts/PortfolioSection";
import {
  User, Bell, Shield, Loader2, Save, Camera, Clock, Tag, X,
  ChevronDown, ChevronUp, Wifi, WifiOff, Image,
  Gamepad2, Code, Briefcase, Palette, Music, Dumbbell, Globe, Video, MessageSquarePlus,
  Eye, EyeOff, Mail, Lock,
} from "lucide-react";

const CATEGORY_TREE = [
  {
    id: "Gaming", label: "Gaming", icon: Gamepad2,
    subs: [
      { id: "Valorant", services: ["Boosting", "Coaching", "VOD Review", "Carry / Duo Partner", "Account Leveling", "Custom Request"] },
      { id: "Arc Raiders", services: ["Raid Carry", "Coaching", "Loot Runs", "Boss Strategy", "Gear Optimization", "Base Building", "Custom Request"] },
      { id: "Fortnite", services: ["Coaching", "Creative Builds", "Carry / Duo", "Account Leveling", "Custom Request"] },
      { id: "Minecraft", services: ["Custom Build", "Server Setup", "Modding", "Redstone Engineering", "Skin / Texture Art", "Custom Request"] },
      { id: "CS2", services: ["Boosting", "Coaching", "VOD Review", "Carry / Duo", "Custom Request"] },
      { id: "Apex Legends", services: ["Boosting", "Coaching", "Badge Unlocking", "Carry / Duo", "Custom Request"] },
      { id: "League of Legends", services: ["Boosting", "Coaching", "VOD Review", "Duo Queue", "Champion Mastery", "Custom Request"] },
      { id: "Roblox", services: ["Scripting", "Building", "Game Dev", "UI Design", "Account Services", "Custom Request"] },
      { id: "GTA", services: ["Money Grinding", "Heists", "Modding Help", "RP Setup", "Account Recovery", "Custom Request"] },
      { id: "Overwatch", services: ["Boosting", "Coaching", "VOD Review", "Carry / Duo", "Custom Request"] },
      { id: "Rocket League", services: ["Boosting", "Coaching", "Training Packs", "Carry / Duo", "Custom Request"] },
      { id: "Dota 2", services: ["Boosting", "Coaching", "VOD Review", "Carry / Duo", "Custom Request"] },
      { id: "FIFA", services: ["Coaching", "Squad Building", "Trading Tips", "FUT Champions", "Custom Request"] },
      { id: "COD", services: ["Boosting", "Coaching", "Camo Grinding", "Carry / Duo", "Custom Request"] },
      { id: "Rust", services: ["Coaching", "Base Design", "Raid Help", "Carry / Duo", "Custom Request"] },
      { id: "Escape from Tarkov", services: ["Coaching", "Carry", "Quest Help", "Loot Runs", "Custom Request"] },
      { id: "World of Warcraft", services: ["Boosting", "Coaching", "Raid Carry", "Dungeon Carry", "Leveling", "Custom Request"] },
      { id: "Destiny 2", services: ["Raid Carry", "Dungeon Carry", "PvP Coaching", "Quest Help", "Custom Request"] },
      { id: "Dead by Daylight", services: ["Coaching", "Carry / Duo", "Rank Boosting", "Custom Request"] },
      { id: "Custom Request", services: ["Any Gaming Task", "Unique Request"] },
    ],
  },
  {
    id: "Tech", label: "Tech", icon: Code,
    subs: [
      { id: "Discord Bots", services: ["Custom Bot", "Bot Hosting", "Bot Configuration", "Custom Request"] },
      { id: "Web Development", services: ["Full Website", "Landing Page", "Bug Fixes", "API Integration", "Custom Request"] },
      { id: "SEO", services: ["Audit", "On-Page SEO", "Link Building", "Keyword Research", "Custom Request"] },
      { id: "Server Setup", services: ["VPS Setup", "Game Server", "Docker / DevOps", "Custom Request"] },
      { id: "App Development", services: ["Mobile App", "Desktop App", "Prototype", "Custom Request"] },
      { id: "WordPress", services: ["Theme Setup", "Plugin Development", "Migration", "Custom Request"] },
      { id: "AI & Automation", services: ["Chatbot Setup", "Workflow Automation", "AI Integration", "Prompt Engineering", "Custom Request"] },
      { id: "Cybersecurity", services: ["Security Audit", "Penetration Testing", "Malware Removal", "Hardening", "Custom Request"] },
      { id: "Database & SQL", services: ["Database Design", "Query Optimization", "Migration", "Backup & Recovery", "Custom Request"] },
      { id: "Networking & WiFi", services: ["Network Setup", "Troubleshooting", "VPN Config", "WiFi Optimization", "Custom Request"] },
      { id: "Cloud & DevOps", services: ["AWS Setup", "CI/CD Pipelines", "Kubernetes", "Monitoring", "Custom Request"] },
      { id: "Custom Request", services: ["Any Tech Task", "Unique Request"] },
    ],
  },
  {
    id: "Business", label: "Business", icon: Briefcase,
    subs: [
      { id: "Marketing", services: ["Social Media", "Ad Campaigns", "Email Marketing", "Brand Strategy", "Custom Request"] },
      { id: "Startup Advice", services: ["Business Plan", "Pitch Deck", "Fundraising", "Mentorship", "Custom Request"] },
      { id: "E-commerce", services: ["Store Setup", "Product Listing", "Dropshipping", "Analytics", "Custom Request"] },
      { id: "Accounting", services: ["Bookkeeping", "Tax Prep", "Financial Modeling", "Custom Request"] },
      { id: "Analytics & Data", services: ["Dashboard Setup", "Data Analysis", "Reporting", "BI Tools", "Custom Request"] },
      { id: "Sales & Outreach", services: ["Cold Outreach", "Lead Generation", "CRM Setup", "Sales Strategy", "Custom Request"] },
      { id: "Investing & Crypto", services: ["Portfolio Review", "Crypto Strategy", "DeFi Setup", "Market Analysis", "Custom Request"] },
      { id: "HR & Hiring", services: ["Job Posting", "Resume Screening", "Interview Prep", "Onboarding", "Custom Request"] },
      { id: "Custom Request", services: ["Any Business Task", "Unique Request"] },
    ],
  },
  {
    id: "Creative", label: "Creative", icon: Palette,
    subs: [
      { id: "Graphic Design", services: ["Logo", "Social Media Graphics", "Branding Kit", "Illustration", "Custom Request"] },
      { id: "Video Editing", services: ["Short Form", "Long Form", "Motion Graphics", "Color Grading", "Custom Request"] },
      { id: "Ad Copy", services: ["Sales Copy", "Product Descriptions", "Email Sequences", "Custom Request"] },
      { id: "Thumbnails", services: ["YouTube Thumbnails", "Stream Overlays", "Banner Art", "Custom Request"] },
      { id: "Photography", services: ["Photo Editing", "Product Photos", "Portrait Retouching", "Compositing", "Custom Request"] },
      { id: "UI/UX Design", services: ["Wireframing", "Prototyping", "User Research", "Design System", "Custom Request"] },
      { id: "Illustration", services: ["Digital Art", "Character Design", "Concept Art", "Icon Design", "Custom Request"] },
      { id: "Copywriting", services: ["Website Copy", "Blog Posts", "Brand Voice", "Taglines", "Custom Request"] },
      { id: "Custom Request", services: ["Any Creative Task", "Unique Request"] },
    ],
  },
  {
    id: "Music", label: "Music", icon: Music,
    subs: [
      { id: "Production", services: ["Beat Making", "Full Production", "Sound Design", "Custom Request"] },
      { id: "Mixing & Mastering", services: ["Mixing", "Mastering", "Stem Mixing", "Custom Request"] },
      { id: "Guitar Lessons", services: ["Beginner", "Intermediate", "Advanced", "Song Learning", "Custom Request"] },
      { id: "Piano Lessons", services: ["Beginner", "Intermediate", "Advanced", "Music Theory", "Custom Request"] },
      { id: "Vocal Coaching", services: ["Technique", "Performance", "Recording", "Pitch Training", "Custom Request"] },
      { id: "Beat Making", services: ["Hip Hop", "EDM", "Lo-Fi", "Custom Beats", "Custom Request"] },
      { id: "Songwriting", services: ["Lyrics", "Melody", "Full Song", "Co-Writing", "Custom Request"] },
      { id: "Custom Request", services: ["Any Music Task", "Unique Request"] },
    ],
  },
  {
    id: "Fitness", label: "Fitness", icon: Dumbbell,
    subs: [
      { id: "Personal Training", services: ["Workout Plan", "Live Coaching", "Form Check", "Custom Request"] },
      { id: "Nutrition Plans", services: ["Meal Plan", "Macro Coaching", "Diet Review", "Custom Request"] },
      { id: "Yoga & Mobility", services: ["Beginner Yoga", "Advanced Yoga", "Stretching", "Recovery", "Custom Request"] },
      { id: "Weight Loss", services: ["Program Design", "Accountability", "Progress Tracking", "Custom Request"] },
      { id: "Sports Coaching", services: ["Technique", "Game Strategy", "Conditioning", "Mental Prep", "Custom Request"] },
      { id: "Injury Rehab", services: ["Exercise Prescription", "Recovery Plan", "Movement Assessment", "Custom Request"] },
      { id: "Custom Request", services: ["Any Fitness Task", "Unique Request"] },
    ],
  },
  {
    id: "Languages", label: "Languages", icon: Globe,
    subs: [
      { id: "English", services: ["Conversation", "Writing", "TOEFL Prep", "Business English", "Custom Request"] },
      { id: "Spanish", services: ["Conversation", "Grammar", "DELE Prep", "Custom Request"] },
      { id: "French", services: ["Conversation", "Grammar", "DELF Prep", "Custom Request"] },
      { id: "German", services: ["Conversation", "Grammar", "Goethe Prep", "Custom Request"] },
      { id: "Portuguese", services: ["Conversation", "Grammar", "CELPE-Bras Prep", "Custom Request"] },
      { id: "Arabic", services: ["Conversation", "Grammar", "MSA", "Dialect", "Custom Request"] },
      { id: "Chinese", services: ["Conversation", "Grammar", "HSK Prep", "Business Chinese", "Custom Request"] },
      { id: "Japanese", services: ["Conversation", "Grammar", "JLPT Prep", "Business Japanese", "Custom Request"] },
      { id: "Korean", services: ["Conversation", "Grammar", "TOPIK Prep", "Custom Request"] },
      { id: "Italian", services: ["Conversation", "Grammar", "CILS Prep", "Custom Request"] },
      { id: "Russian", services: ["Conversation", "Grammar", "TORFL Prep", "Custom Request"] },
      { id: "Hindi", services: ["Conversation", "Grammar", "Reading & Writing", "Custom Request"] },
      { id: "Dutch", services: ["Conversation", "Grammar", "NT2 Prep", "Custom Request"] },
      { id: "Turkish", services: ["Conversation", "Grammar", "TYS Prep", "Custom Request"] },
      { id: "Translation", services: ["Document Translation", "Localization", "Subtitling", "Proofreading", "Custom Request"] },
      { id: "Custom Request", services: ["Any Language Task", "Unique Request"] },
    ],
  },
  {
    id: "Content", label: "Content", icon: Video,
    subs: [
      { id: "Streaming", services: ["Stream Setup", "OBS Config", "Growth Strategy", "Custom Request"] },
      { id: "YouTube", services: ["Channel Strategy", "Video SEO", "Script Writing", "Custom Request"] },
      { id: "TikTok", services: ["Content Strategy", "Editing", "Growth Hacks", "Custom Request"] },
      { id: "Instagram", services: ["Content Strategy", "Reels Editing", "Growth", "Aesthetics", "Custom Request"] },
      { id: "Podcasting", services: ["Setup & Equipment", "Editing", "Distribution", "Growth", "Custom Request"] },
      { id: "Blogging & SEO Writing", services: ["Blog Strategy", "SEO Articles", "Content Calendar", "Ghostwriting", "Custom Request"] },
      { id: "Community Management", services: ["Discord Moderation", "Engagement Strategy", "Community Building", "Custom Request"] },
      { id: "Custom Request", services: ["Any Content Task", "Unique Request"] },
    ],
  },
];

const CategoryAccordion = ({
  subscribedCategories,
  onToggle,
}: {
  subscribedCategories: string[];
  onToggle: (category: string) => void;
}) => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedSubs, setExpandedSubs] = useState<string[]>([]);

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]
    );
  };

  const toggleSubExpand = (subKey: string) => {
    setExpandedSubs((prev) =>
      prev.includes(subKey) ? prev.filter((s) => s !== subKey) : [...prev, subKey]
    );
  };

  const getServiceKey = (groupId: string, subId: string, service: string) =>
    `${groupId}: ${subId}: ${service}`;

  const countGroupSubscribed = (group: typeof CATEGORY_TREE[0]) =>
    group.subs.reduce(
      (acc, sub) => acc + sub.services.filter((s) => subscribedCategories.includes(getServiceKey(group.id, sub.id, s))).length,
      0
    );

  const countSubSubscribed = (groupId: string, sub: typeof CATEGORY_TREE[0]["subs"][0]) =>
    sub.services.filter((s) => subscribedCategories.includes(getServiceKey(groupId, sub.id, s))).length;

  return (
    <div className="space-y-1">
      {CATEGORY_TREE.map((group) => {
        const Icon = group.icon;
        const isExpanded = expandedGroups.includes(group.id);
        const groupCount = countGroupSubscribed(group);

        return (
          <div key={group.id}>
            <button
              onClick={() => toggleExpand(group.id)}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3.5 transition-colors hover:bg-accent/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">{group.label}</p>
                <p className="text-xs text-muted-foreground">
                  {groupCount > 0 ? `${groupCount} service${groupCount > 1 ? "s" : ""} subscribed` : "Not subscribed"}
                </p>
              </div>
              {groupCount > 0 && (
                <Badge variant="secondary" className="bg-primary/[0.08] text-primary text-xs mr-2">
                  {groupCount}
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isExpanded && (
              <div className="ml-4 mb-2 border-l border-border pl-2 space-y-0.5 animate-fade-in">
                {group.subs.map((sub) => {
                  const subKey = `${group.id}:${sub.id}`;
                  const isSubExpanded = expandedSubs.includes(subKey);
                  const subCount = countSubSubscribed(group.id, sub);

                  return (
                    <div key={sub.id}>
                      <button
                        onClick={() => toggleSubExpand(subKey)}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-accent/30"
                      >
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-foreground">{sub.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {subCount > 0 ? `${subCount} of ${sub.services.length}` : `${sub.services.length} services`}
                          </p>
                        </div>
                        {subCount > 0 && (
                          <Badge variant="secondary" className="bg-primary/[0.08] text-primary text-xs mr-1">
                            {subCount}
                          </Badge>
                        )}
                        {isSubExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>

                      {isSubExpanded && (
                        <div className="ml-4 mb-1 border-l border-border pl-3 space-y-0.5 animate-fade-in">
                          {sub.services.map((service) => {
                            const key = getServiceKey(group.id, sub.id, service);
                            const isActive = subscribedCategories.includes(key);
                            return (
                              <div
                                key={service}
                                className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-accent/20"
                              >
                                <span className="text-sm text-foreground">{service}</span>
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={() => onToggle(key)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const SecurityTab = ({ email, setEmail }: { email: string; setEmail: (v: string) => void }) => {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [newEmail, setNewEmail] = useState(email);
  const [changingEmail, setChangingEmail] = useState(false);

  const passwordStrength = (pw: string) => {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak", color: "text-destructive" };
    if (score <= 2) return { label: "Fair", color: "text-yellow-500" };
    return { label: "Strong", color: "text-chart-2" };
  };

  const strength = passwordStrength(newPassword);

  const handleChangePassword = async () => {
    if (!oldPassword) { toast({ title: "Enter your current password", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "New password must be at least 6 characters", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }

    setChangingPw(true);
    try {
      // Verify old password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
      if (signInError) { toast({ title: "Current password is incorrect", variant: "destructive" }); return; }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setChangingPw(false); }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || newEmail === email) { toast({ title: "Enter a different email", variant: "destructive" }); return; }
    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({ title: "Confirmation sent", description: "Check both your old and new email to confirm the change." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setChangingEmail(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle><CardDescription>Enter your current password and choose a new one</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type={showOld ? "text" : "password"} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="pl-10 pr-10" placeholder="Enter current password" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 pr-10" placeholder="Enter new password" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {strength && <p className={`text-xs font-medium ${strength.color}`}>Strength: {strength.label}</p>}
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10" placeholder="Confirm new password" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPw} className="gap-2">
            {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Update Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Email</CardTitle><CardDescription>A confirmation will be sent to both your current and new email</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Email</Label>
            <Input value={email} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>New Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="pl-10" placeholder="Enter new email" />
            </div>
          </div>
          <Button onClick={handleChangeEmail} disabled={changingEmail} className="gap-2">
            {changingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Update Email
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle><CardDescription>Once deleted, there's no going back</CardDescription></CardHeader>
        <CardContent>
          <Button variant="destructive">Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  );
};

const Settings = () => {
  useSEO({ title: "Settings", noIndex: true });
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
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="h-4 w-4" /> Profile</TabsTrigger>
            {isMentor && (
              <>
                <TabsTrigger value="portfolio" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Image className="h-4 w-4" /> Portfolio</TabsTrigger>
                <TabsTrigger value="categories" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Tag className="h-4 w-4" /> Categories</TabsTrigger>
              </>
            )}
            <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
            <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Shield className="h-4 w-4" /> Security</TabsTrigger>
            
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

                {/* Online status toggle moved to profile dropdown menu */}

                <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {isMentor && (
            <TabsContent value="portfolio">
              {profile && <PortfolioSection userId={profile.id} editable />}
            </TabsContent>
          )}

          {isMentor && (
            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Category Subscriptions</CardTitle>
                  <CardDescription>
                    Toggle the services you can provide to receive notifications from buyers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 flex items-center gap-3">
                    <Badge variant="secondary" className="bg-primary/[0.08] text-primary">
                      {subscribedCategories.length} subscribed
                    </Badge>
                  </div>
                  <CategoryAccordion
                    subscribedCategories={subscribedCategories}
                    onToggle={toggleCategory}
                  />
                </CardContent>
              </Card>
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
            <SecurityTab email={email} setEmail={setEmail} />
          </TabsContent>
        </Tabs>
      </main>
      
    </div>
  );
};

export default Settings;
