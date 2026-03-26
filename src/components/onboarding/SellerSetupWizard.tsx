import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Tag, Briefcase, Image, DollarSign,
  ArrowRight, ArrowLeft, Check, Loader2,
  ChevronDown, ChevronUp, Plus, Trash2, ExternalLink, X, Sparkles,
  Gamepad2, Code, Palette, Music, Dumbbell, Globe, Video,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SellerSetupWizardProps {
  userId: string;
  onComplete: () => void;
}

const CATEGORY_TREE = [
  {
    id: "Gaming", label: "Gaming", icon: Gamepad2,
    subs: [
      { id: "Valorant", services: ["Boosting", "Coaching", "VOD Review", "Carry / Duo Partner", "Account Leveling", "Custom Request"] },
      { id: "Arc Raiders", services: ["Raid Carry", "Coaching", "Loot Runs", "Boss Strategy", "Gear Optimization", "Expedition", "Items", "Custom Request"] },
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
      { id: "AI & Automation", services: ["Chatbot Setup", "Workflow Automation", "AI Integration", "Prompt Engineering", "Custom Request"] },
      { id: "Custom Request", services: ["Any Tech Task", "Unique Request"] },
    ],
  },
  {
    id: "Business", label: "Business", icon: Briefcase,
    subs: [
      { id: "Marketing", services: ["Social Media", "Ad Campaigns", "Email Marketing", "Brand Strategy", "Custom Request"] },
      { id: "Startup Advice", services: ["Business Plan", "Pitch Deck", "Fundraising", "Mentorship", "Custom Request"] },
      { id: "E-commerce", services: ["Store Setup", "Product Listing", "Dropshipping", "Analytics", "Custom Request"] },
      { id: "Custom Request", services: ["Any Business Task", "Unique Request"] },
    ],
  },
  {
    id: "Creative", label: "Creative", icon: Palette,
    subs: [
      { id: "Graphic Design", services: ["Logo", "Social Media Graphics", "Branding Kit", "Illustration", "Custom Request"] },
      { id: "Video Editing", services: ["Short Form", "Long Form", "Motion Graphics", "Color Grading", "Custom Request"] },
      { id: "Thumbnails", services: ["YouTube Thumbnails", "Stream Overlays", "Banner Art", "Custom Request"] },
      { id: "UI/UX Design", services: ["Wireframing", "Prototyping", "User Research", "Design System", "Custom Request"] },
      { id: "Custom Request", services: ["Any Creative Task", "Unique Request"] },
    ],
  },
  {
    id: "Music", label: "Music", icon: Music,
    subs: [
      { id: "Production", services: ["Beat Making", "Full Production", "Sound Design", "Custom Request"] },
      { id: "Mixing & Mastering", services: ["Mixing", "Mastering", "Stem Mixing", "Custom Request"] },
      { id: "Guitar Lessons", services: ["Beginner", "Intermediate", "Advanced", "Custom Request"] },
      { id: "Custom Request", services: ["Any Music Task", "Unique Request"] },
    ],
  },
  {
    id: "Fitness", label: "Fitness", icon: Dumbbell,
    subs: [
      { id: "Personal Training", services: ["Workout Plan", "Live Coaching", "Form Check", "Custom Request"] },
      { id: "Nutrition Plans", services: ["Meal Plan", "Macro Coaching", "Diet Review", "Custom Request"] },
      { id: "Custom Request", services: ["Any Fitness Task", "Unique Request"] },
    ],
  },
  {
    id: "Languages", label: "Languages", icon: Globe,
    subs: [
      { id: "English", services: ["Conversation", "Writing", "TOEFL Prep", "Business English", "Custom Request"] },
      { id: "Spanish", services: ["Conversation", "Grammar", "DELE Prep", "Custom Request"] },
      { id: "Translation", services: ["Document Translation", "Localization", "Subtitling", "Custom Request"] },
      { id: "Custom Request", services: ["Any Language Task", "Unique Request"] },
    ],
  },
  {
    id: "Content", label: "Content", icon: Video,
    subs: [
      { id: "Streaming", services: ["Stream Setup", "OBS Config", "Growth Strategy", "Custom Request"] },
      { id: "YouTube", services: ["Channel Strategy", "Video SEO", "Script Writing", "Custom Request"] },
      { id: "TikTok", services: ["Content Strategy", "Editing", "Growth Hacks", "Custom Request"] },
      { id: "Custom Request", services: ["Any Content Task", "Unique Request"] },
    ],
  },
];

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

/* ─── Step 1: Categories ─── */
const CategoryStep = ({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedSubs, setExpandedSubs] = useState<string[]>([]);

  const getKey = (g: string, s: string, svc: string) => `${g}: ${s}: ${svc}`;

  return (
    <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
      {CATEGORY_TREE.map((group) => {
        const Icon = group.icon;
        const open = expandedGroups.includes(group.id);
        const count = group.subs.reduce(
          (a, sub) => a + sub.services.filter((s) => selected.includes(getKey(group.id, sub.id, s))).length,
          0
        );

        return (
          <div key={group.id}>
            <button
              onClick={() =>
                setExpandedGroups((p) =>
                  p.includes(group.id) ? p.filter((g) => g !== group.id) : [...p, group.id]
                )
              }
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-accent/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-left font-medium text-foreground text-sm">{group.label}</span>
              {count > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  {count}
                </Badge>
              )}
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {open && (
              <div className="ml-4 border-l border-border pl-2 space-y-0.5 animate-fade-in">
                {group.subs.map((sub) => {
                  const subKey = `${group.id}:${sub.id}`;
                  const subOpen = expandedSubs.includes(subKey);
                  const subCount = sub.services.filter((s) =>
                    selected.includes(getKey(group.id, sub.id, s))
                  ).length;

                  return (
                    <div key={sub.id}>
                      <button
                        onClick={() =>
                          setExpandedSubs((p) =>
                            p.includes(subKey) ? p.filter((s) => s !== subKey) : [...p, subKey]
                          )
                        }
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent/30 transition-colors"
                      >
                        <span className="flex-1 text-left text-sm text-foreground">{sub.id}</span>
                        {subCount > 0 && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                            {subCount}
                          </Badge>
                        )}
                        {subOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>

                      {subOpen && (
                        <div className="ml-3 border-l border-border pl-3 space-y-0.5 animate-fade-in">
                          {sub.services.map((svc) => {
                            const key = getKey(group.id, sub.id, svc);
                            return (
                              <div key={svc} className="flex items-center justify-between rounded-lg px-3 py-1.5 hover:bg-accent/20">
                                <span className="text-sm text-foreground">{svc}</span>
                                <Switch checked={selected.includes(key)} onCheckedChange={() => onToggle(key)} />
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

/* ─── Step 2: Portfolio ─── */
interface PortfolioEntry {
  title: string;
  description: string;
  link_url: string;
}

const PortfolioStep = ({
  items,
  setItems,
}: {
  items: PortfolioEntry[];
  setItems: React.Dispatch<React.SetStateAction<PortfolioEntry[]>>;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PortfolioEntry>({ title: "", description: "", link_url: "" });

  const addItem = () => {
    if (!form.title.trim()) return;
    setItems((prev) => [...prev, { ...form }]);
    setForm({ title: "", description: "", link_url: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
      <p className="text-sm text-muted-foreground">
        Showcase your best work to stand out. Add projects, case studies, or samples.
      </p>

      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground text-sm">{item.title}</h4>
              {item.link_url && (
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {showForm ? (
        <div className="space-y-3 p-4 rounded-lg border border-border bg-accent/20">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="e.g. Valorant Rank Boost" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-16" />
          </div>
          <div className="space-y-1.5">
            <Label>Link (optional)</Label>
            <Input placeholder="https://..." value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addItem} disabled={!form.title.trim()} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="gap-2 w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Add Portfolio Item
        </Button>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground text-center py-2">
          You can always add portfolio items later in Settings
        </p>
      )}
    </div>
  );
};

/* ─── Step 3: Skills ─── */
const SkillsStep = ({
  skills,
  setSkills,
}: {
  skills: string[];
  setSkills: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const [input, setInput] = useState("");

  const addSkill = () => {
    const trimmed = input.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills((prev) => [...prev, trimmed]);
    setInput("");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add skills that describe what you're good at. These will appear on your profile.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="e.g. React, Video Editing, Coaching..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
        />
        <Button type="button" size="sm" onClick={addSkill} disabled={!input.trim()} className="gap-1 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="gap-1 text-sm">
            {skill}
            <button onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {skills.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          You can always add skills later in Settings
        </p>
      )}
    </div>
  );
};

/* ─── Step 4: Rate & Bio ─── */
const ProfileStep = ({
  hourlyRate,
  setHourlyRate,
  bio,
  setBio,
}: {
  hourlyRate: string;
  setHourlyRate: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
}) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Set your hourly rate and write a short bio to attract buyers.
    </p>
    <div className="space-y-2">
      <Label>Hourly Rate ($)</Label>
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="number"
          min={1}
          placeholder="25"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label>Expert Bio</Label>
      <Textarea
        placeholder="Tell buyers about your experience, specialties, and what makes you great..."
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        className="min-h-28"
      />
    </div>
  </div>
);

/* ─── Main Wizard ─── */
const SellerSetupWizard = ({ userId, onComplete }: SellerSetupWizardProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

   // Step 1 state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 2 state
  const [portfolioItems, setPortfolioItems] = useState<PortfolioEntry[]>([]);

  // Step 3 state
  const [skills, setSkills] = useState<string[]>([]);

  // Step 4 state
  const [hourlyRate, setHourlyRate] = useState("");
  const [bio, setBio] = useState("");

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save categories
      if (selectedCategories.length > 0) {
        const rows = selectedCategories.map((cat) => ({ user_id: userId, category: cat }));
        await supabase.from("expert_categories").insert(rows);
      }

      // Save portfolio items
      if (portfolioItems.length > 0) {
        const rows = portfolioItems.map((item) => ({
          user_id: userId,
          title: item.title.trim(),
          description: item.description.trim() || null,
          link_url: item.link_url.trim() || null,
        }));
        await supabase.from("portfolio_items").insert(rows);
      }

      // Update profile
      const updates: Record<string, any> = {};
      if (hourlyRate) updates.hourly_rate = parseFloat(hourlyRate);
      if (bio.trim()) updates.bio = bio.trim();
      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", userId);
      }

      toast({ title: "Expert profile set up! 🚀", description: "You're ready to start receiving requests." });
      onComplete();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const stepIcons = [Tag, Image, DollarSign];
  const stepTitles = ["Choose your services", "Showcase your work", "Set your rate"];
  const stepDescs = [
    `Select the services you can offer (${selectedCategories.length} selected)`,
    "Add portfolio items to build trust (optional)",
    "Set your pricing and write an expert bio (optional)",
  ];

  const StepIcon = stepIcons[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 shadow-2xl border-border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <StepIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{stepTitles[step - 1]}</CardTitle>
          <CardDescription>{stepDescs[step - 1]}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {step === 1 && <CategoryStep selected={selectedCategories} onToggle={toggleCategory} />}
              {step === 2 && <PortfolioStep items={portfolioItems} setItems={setPortfolioItems} />}
              {step === 3 && <ProfileStep hourlyRate={hourlyRate} setHourlyRate={setHourlyRate} bio={bio} setBio={setBio} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 1} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {step < totalSteps ? (
              <Button onClick={() => setStep(step + 1)} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Finish Setup
              </Button>
            )}
          </div>

          <div className="text-center">
            <Button variant="link" className="text-muted-foreground" onClick={onComplete}>
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerSetupWizard;
