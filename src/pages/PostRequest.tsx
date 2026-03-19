import { useState, useEffect, useRef } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useNavigate, useSearchParams } from "react-router-dom";
import CategoryTemplateFields from "@/components/post-request/CategoryTemplateFields";
import { supabase } from "@/integrations/supabase/client";
import { useModeration } from "@/hooks/use-moderation";
import QuickAuthDialog from "@/components/auth/QuickAuthDialog";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Clock, Users, Star, Check, Loader2, ArrowLeft, Send, Shield, Sparkles,
  Gamepad2, Code, Briefcase, Palette, Music, Dumbbell, Globe, Video,
  Swords, Crosshair, Pickaxe, Target, Trophy, ChevronRight,
  Bot, Monitor, Search, Server, Smartphone, Layout, Database, Cpu, Wifi, Cloud,
  TrendingUp, Rocket, ShoppingCart, Calculator, BarChart3, HandCoins, Megaphone, Users2,
  PenTool, Film, FileText, Image, Camera, Type, Brush, Layers,
  Headphones, Guitar, Mic, Piano, Disc3,
  Apple, Salad, Heart, Activity,
  BookOpen, Languages, GraduationCap,
  Tv, Youtube, Clapperboard, Radio, Podcast, Instagram,
  MessageSquarePlus, Wand2, PencilLine,
} from "lucide-react";

const BROAD_CATEGORIES = [
  { id: "Gaming", label: "Gaming", icon: Gamepad2, description: "Boosting, coaching & more" },
  { id: "Tech", label: "Tech", icon: Code, description: "Dev, bots, servers & SEO" },
  { id: "Business", label: "Business", icon: Briefcase, description: "Marketing, e-com & growth" },
  { id: "Creative", label: "Creative", icon: Palette, description: "Design, video & copy" },
  { id: "Music", label: "Music", icon: Music, description: "Production, mixing & lessons" },
  { id: "Fitness", label: "Fitness", icon: Dumbbell, description: "Training & nutrition" },
  { id: "Languages", label: "Languages", icon: Globe, description: "Tutoring & translation" },
  { id: "Content", label: "Content", icon: Video, description: "Streaming, YouTube & TikTok" },
];

const SUBCATEGORIES: Record<string, { id: string; label: string; icon: any }[]> = {
  Gaming: [
    { id: "Gaming: Valorant", label: "Valorant", icon: Crosshair },
    { id: "Gaming: Fortnite", label: "Fortnite", icon: Target },
    { id: "Gaming: Minecraft", label: "Minecraft", icon: Pickaxe },
    { id: "Gaming: CS2", label: "CS2", icon: Swords },
    { id: "Gaming: Apex", label: "Apex Legends", icon: Trophy },
    { id: "Gaming: League of Legends", label: "League of Legends", icon: Gamepad2 },
    { id: "Gaming: Roblox", label: "Roblox", icon: Layers },
    { id: "Gaming: GTA", label: "GTA V / Online", icon: Target },
    { id: "Gaming: Overwatch", label: "Overwatch 2", icon: Crosshair },
    { id: "Gaming: Rocket League", label: "Rocket League", icon: Trophy },
    { id: "Gaming: Dota 2", label: "Dota 2", icon: Swords },
    { id: "Gaming: FIFA", label: "EA FC / FIFA", icon: Activity },
    { id: "Gaming: COD", label: "Call of Duty", icon: Crosshair },
    { id: "Gaming: Rust", label: "Rust", icon: Pickaxe },
    { id: "Gaming: Escape from Tarkov", label: "Escape from Tarkov", icon: Shield },
    { id: "Gaming: World of Warcraft", label: "World of Warcraft", icon: Swords },
    { id: "Gaming: Destiny 2", label: "Destiny 2", icon: Target },
    { id: "Gaming: Dead by Daylight", label: "Dead by Daylight", icon: Gamepad2 },
    { id: "Gaming: Custom Request", label: "Custom Request", icon: Wand2 },
  ],
  Tech: [
    { id: "Tech: Discord Bots", label: "Discord Bots", icon: Bot },
    { id: "Tech: Web Dev", label: "Web Development", icon: Monitor },
    { id: "Tech: SEO", label: "SEO", icon: Search },
    { id: "Tech: Server Setup", label: "Server Setup", icon: Server },
    { id: "Tech: App Dev", label: "App Development", icon: Smartphone },
    { id: "Tech: WordPress", label: "WordPress", icon: Layout },
    { id: "Tech: AI & Automation", label: "AI & Automation", icon: Cpu },
    { id: "Tech: Cybersecurity", label: "Cybersecurity", icon: Shield },
    { id: "Tech: Database", label: "Database & SQL", icon: Database },
    { id: "Tech: Networking", label: "Networking & WiFi", icon: Wifi },
    { id: "Tech: Cloud", label: "Cloud & DevOps", icon: Cloud },
    { id: "Tech: Custom Request", label: "Custom Request", icon: Wand2 },
  ],
  Business: [
    { id: "Business: Marketing", label: "Marketing", icon: TrendingUp },
    { id: "Business: Startup", label: "Startup Advice", icon: Rocket },
    { id: "Business: E-commerce", label: "E-commerce", icon: ShoppingCart },
    { id: "Business: Accounting", label: "Accounting", icon: Calculator },
    { id: "Business: Analytics", label: "Analytics & Data", icon: BarChart3 },
    { id: "Business: Sales", label: "Sales & Outreach", icon: Megaphone },
    { id: "Business: Investing", label: "Investing & Crypto", icon: HandCoins },
    { id: "Business: HR", label: "HR & Hiring", icon: Users2 },
    { id: "Business: Custom Request", label: "Custom Request", icon: Wand2 },
  ],
  Creative: [
    { id: "Creative: Design", label: "Graphic Design", icon: PenTool },
    { id: "Creative: Video Editing", label: "Video Editing", icon: Film },
    { id: "Creative: Ad Copy", label: "Ad Copy", icon: FileText },
    { id: "Creative: Thumbnails", label: "Thumbnails", icon: Image },
    { id: "Creative: Photography", label: "Photography", icon: Camera },
    { id: "Creative: UI/UX", label: "UI/UX Design", icon: Layers },
    { id: "Creative: Illustration", label: "Illustration", icon: Brush },
    { id: "Creative: Copywriting", label: "Copywriting", icon: Type },
    { id: "Creative: Custom Request", label: "Custom Request", icon: Wand2 },
  ],
  Music: [
    { id: "Music: Production", label: "Production", icon: Headphones },
    { id: "Music: Mixing", label: "Mixing & Mastering", icon: Mic },
    { id: "Music: Guitar", label: "Guitar Lessons", icon: Guitar },
    { id: "Music: Piano", label: "Piano Lessons", icon: Piano },
    { id: "Music: Vocals", label: "Vocal Coaching", icon: Mic },
    { id: "Music: Beats", label: "Beat Making", icon: Disc3 },
    { id: "Music: Songwriting", label: "Songwriting", icon: PencilLine },
    { id: "Music: Custom Request", label: "Custom Request", icon: Wand2 },
  ],
  Fitness: [
    { id: "Fitness: Training", label: "Personal Training", icon: Dumbbell },
    { id: "Fitness: Nutrition", label: "Nutrition Plans", icon: Apple },
    { id: "Fitness: Yoga", label: "Yoga & Mobility", icon: Activity },
    { id: "Fitness: Weight Loss", label: "Weight Loss", icon: Heart },
    { id: "Fitness: Sports Coaching", label: "Sports Coaching", icon: Trophy },
    { id: "Fitness: Rehab", label: "Injury Rehab", icon: Activity },
    { id: "Fitness: Custom Request", label: "Custom Request", icon: Wand2 },
  ],
  Languages: [
    { id: "Languages: English", label: "English", icon: BookOpen },
    { id: "Languages: Spanish", label: "Spanish", icon: Languages },
    { id: "Languages: French", label: "French", icon: Languages },
    { id: "Languages: German", label: "German", icon: Languages },
    { id: "Languages: Portuguese", label: "Portuguese", icon: Languages },
    { id: "Languages: Arabic", label: "Arabic", icon: Languages },
    { id: "Languages: Chinese", label: "Chinese", icon: Languages },
    { id: "Languages: Japanese", label: "Japanese", icon: Languages },
    { id: "Languages: Korean", label: "Korean", icon: Languages },
    { id: "Languages: Italian", label: "Italian", icon: Languages },
    { id: "Languages: Russian", label: "Russian", icon: Languages },
    { id: "Languages: Hindi", label: "Hindi", icon: Languages },
    { id: "Languages: Dutch", label: "Dutch", icon: Languages },
    { id: "Languages: Turkish", label: "Turkish", icon: Languages },
    { id: "Languages: Translation", label: "Translation", icon: GraduationCap },
    { id: "Languages: Custom Request", label: "Custom Request", icon: Wand2 },
  ],
  Content: [
    { id: "Content: Streaming", label: "Streaming", icon: Tv },
    { id: "Content: YouTube", label: "YouTube", icon: Youtube },
    { id: "Content: TikTok", label: "TikTok", icon: Clapperboard },
    { id: "Content: Instagram", label: "Instagram", icon: Instagram },
    { id: "Content: Podcasting", label: "Podcasting", icon: Podcast },
    { id: "Content: Blogging", label: "Blogging & SEO Writing", icon: FileText },
    { id: "Content: Community", label: "Community Management", icon: Users },
    { id: "Content: Custom Request", label: "Custom Request", icon: Wand2 },
  ],
};

const TITLE_PLACEHOLDERS: Record<string, string> = {
  "Gaming: Valorant": 'e.g. "Boost me to Diamond rank"',
  "Gaming: Fortnite": 'e.g. "Need a duo partner for ranked"',
  "Gaming: Minecraft": 'e.g. "Fix Minecraft server TPS drops"',
  "Gaming: CS2": 'e.g. "Coach me to reach Faceit Level 8"',
  "Gaming: Apex": 'e.g. "Help me hit Masters this split"',
  "Gaming: League of Legends": 'e.g. "Coaching for jungle macro"',
  "Gaming: Roblox": 'e.g. "Script a custom game for my Roblox experience"',
  "Gaming: GTA": 'e.g. "Help me grind Cayo Perico heist"',
  "Gaming: Overwatch": 'e.g. "Coach me to reach Grandmaster on support"',
  "Gaming: Rocket League": 'e.g. "Teach me advanced aerial mechanics"',
  "Gaming: Dota 2": 'e.g. "Boost my MMR or coach me mid lane"',
  "Gaming: FIFA": 'e.g. "Build me a meta squad for FUT Champions"',
  "Gaming: COD": 'e.g. "Help me improve my Warzone K/D"',
  "Gaming: Rust": 'e.g. "Help me set up and defend a base"',
  "Gaming: Escape from Tarkov": 'e.g. "Guide me through quest progression"',
  "Gaming: World of Warcraft": 'e.g. "Boost my mythic+ rating"',
  "Gaming: Destiny 2": 'e.g. "Help me complete a raid or dungeon"',
  "Gaming: Dead by Daylight": 'e.g. "Coach me on killer strategy"',
  "Tech: Discord Bots": 'e.g. "Build a custom moderation bot"',
  "Tech: Web Dev": 'e.g. "Fix my React app login bug"',
  "Tech: SEO": 'e.g. "Audit and improve my site SEO"',
  "Tech: Server Setup": 'e.g. "Set up a VPS with Nginx"',
  "Tech: App Dev": 'e.g. "Build a mobile app prototype"',
  "Tech: WordPress": 'e.g. "Speed up my WordPress site"',
  "Tech: AI & Automation": 'e.g. "Build a chatbot for my business"',
  "Tech: Cybersecurity": 'e.g. "Audit my website for vulnerabilities"',
  "Tech: Database": 'e.g. "Optimize my slow SQL queries"',
  "Tech: Networking": 'e.g. "Fix my home network setup"',
  "Tech: Cloud": 'e.g. "Deploy my app to AWS"',
  "Business: Marketing": 'e.g. "Create a social media strategy"',
  "Business: Startup": 'e.g. "Review my pitch deck"',
  "Business: E-commerce": 'e.g. "Set up my Shopify store"',
  "Business: Accounting": 'e.g. "Help with quarterly tax filing"',
  "Business: Analytics": 'e.g. "Set up Google Analytics tracking"',
  "Business: Sales": 'e.g. "Write cold outreach emails"',
  "Business: Investing": 'e.g. "Help me understand DeFi basics"',
  "Business: HR": 'e.g. "Write a job posting for my team"',
  "Creative: Design": 'e.g. "Design a logo for my brand"',
  "Creative: Video Editing": 'e.g. "Edit a 10-min YouTube video"',
  "Creative: Ad Copy": 'e.g. "Write copy for my Facebook ads"',
  "Creative: Thumbnails": 'e.g. "Create 5 YouTube thumbnails"',
  "Creative: Photography": 'e.g. "Edit and retouch my photos"',
  "Creative: UI/UX": 'e.g. "Design my app landing page"',
  "Creative: Illustration": 'e.g. "Draw a custom character"',
  "Creative: Copywriting": 'e.g. "Write my website homepage copy"',
  "Music: Production": 'e.g. "Produce a lo-fi beat"',
  "Music: Mixing": 'e.g. "Mix and master my track"',
  "Music: Guitar": 'e.g. "Teach me fingerpicking basics"',
  "Music: Piano": 'e.g. "Learn jazz piano chords"',
  "Music: Vocals": 'e.g. "Help me improve my vocal range"',
  "Music: Beats": 'e.g. "Make a trap beat for my song"',
  "Music: Songwriting": 'e.g. "Co-write lyrics for my EP"',
  "Fitness: Training": 'e.g. "Create a 12-week workout plan"',
  "Fitness: Nutrition": 'e.g. "Build a meal plan for bulking"',
  "Fitness: Yoga": 'e.g. "Beginner yoga routine for flexibility"',
  "Fitness: Weight Loss": 'e.g. "Help me lose 10kg in 3 months"',
  "Fitness: Sports Coaching": 'e.g. "Improve my basketball shooting"',
  "Fitness: Rehab": 'e.g. "Recovery exercises for knee pain"',
  "Languages: English": 'e.g. "Help me prep for IELTS speaking"',
  "Languages: Spanish": 'e.g. "Conversational Spanish lessons"',
  "Languages: French": 'e.g. "Help me with French pronunciation"',
  "Languages: German": 'e.g. "Prep for Goethe B2 exam"',
  "Languages: Portuguese": 'e.g. "Brazilian Portuguese for beginners"',
  "Languages: Arabic": 'e.g. "Learn conversational Arabic"',
  "Languages: Chinese": 'e.g. "Mandarin lessons for HSK prep"',
  "Languages: Japanese": 'e.g. "Help me learn JLPT N3 kanji"',
  "Languages: Korean": 'e.g. "Practice Korean conversation"',
  "Languages: Italian": 'e.g. "Italian for travel basics"',
  "Languages: Russian": 'e.g. "Russian grammar tutoring"',
  "Languages: Hindi": 'e.g. "Learn Hindi for beginners"',
  "Languages: Dutch": 'e.g. "Dutch lessons for integration exam"',
  "Languages: Turkish": 'e.g. "Conversational Turkish practice"',
  "Languages: Translation": 'e.g. "Translate my document to English"',
  "Content: Streaming": 'e.g. "Set up my Twitch overlays"',
  "Content: YouTube": 'e.g. "Grow my YouTube channel"',
  "Content: TikTok": 'e.g. "Edit viral TikTok clips"',
  "Content: Instagram": 'e.g. "Plan my Instagram content grid"',
  "Content: Podcasting": 'e.g. "Edit and produce my podcast"',
  "Content: Blogging": 'e.g. "Write SEO blog posts for my site"',
  "Content: Community": 'e.g. "Manage my Discord community"',
};

const BROAD_PLACEHOLDERS: Record<string, string> = {
  Gaming: 'e.g. "Help me rank up in my game"',
  Tech: 'e.g. "Fix a bug in my project"',
  Business: 'e.g. "Help grow my online business"',
  Creative: 'e.g. "Design something for my brand"',
  Music: 'e.g. "Help with my music project"',
  Fitness: 'e.g. "Create a workout plan for me"',
  Languages: 'e.g. "Help me practice a language"',
  Content: 'e.g. "Grow my content channel"',
};

interface Quote {
  id: string;
  expert_id: string;
  price: number;
  estimated_minutes: number;
  message: string | null;
  created_at: string;
  expert_profile?: {
    display_name: string | null;
    rating_avg: number | null;
    total_sessions: number | null;
  };
}

const PostRequest = () => {
  useSEO({ title: "Post a Request", noIndex: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { checkContent } = useModeration();

  const [wizardStep, setWizardStep] = useState<"choose-method" | "auto-match" | "category" | "subcategory" | "ai-refine" | "details" | "waiting" | "matching">("choose-method");
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [autoMatchResult, setAutoMatchResult] = useState<{ title: string; description: string; category: string; broad_category: string; clarifying_note: string } | null>(null);
  const autoMatchTriggered = useRef(false);
  const [matchingData, setMatchingData] = useState<{ onlineSellers: number; avgResponseMin: number } | null>(null);
  const [broadCategory, setBroadCategory] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [description, setDescription] = useState("");
  const [deadlineValue, setDeadlineValue] = useState(30);
  const [deadlineUnit, setDeadlineUnit] = useState<"minutes" | "hours" | "days">("minutes");
  
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const pendingSubmitRef = useRef(false);

  // AI refine state
  const [userIdea, setUserIdea] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const ROTATING_PLACEHOLDERS = [
    'e.g. "Fix a React login bug that redirects to a blank page"',
    'e.g. "Boost my Valorant account from Gold to Diamond"',
    'e.g. "Design a modern logo for my startup"',
    'e.g. "Edit a 10-minute YouTube video with transitions"',
    'e.g. "Build a custom Discord bot for my server"',
    'e.g. "Create a 12-week workout plan for muscle gain"',
    'e.g. "Write SEO-optimized blog posts for my website"',
    'e.g. "Mix and master my new track"',
    'e.g. "Set up my Shopify store from scratch"',
    'e.g. "Help me prep for IELTS speaking test"',
    'e.g. "Create a social media marketing strategy"',
    'e.g. "Deploy my app to AWS with CI/CD"',
    'e.g. "Design thumbnails for my YouTube channel"',
    'e.g. "Translate my website to Spanish"',
    'e.g. "Build a landing page for my SaaS product"',
  ];
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title: string;
    description: string;
    category: string;
    broad_category: string;
    clarifying_note: string;
  } | null>(null);

  // Track auth state reactively & auto-submit after auth
  const pendingSubmitTriggered = useRef(false);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      if (uid && pendingSubmitRef.current && !pendingSubmitTriggered.current) {
        pendingSubmitRef.current = false;
        pendingSubmitTriggered.current = true;
        // Use a longer delay to ensure state is settled, then retry submit
        setTimeout(() => {
          pendingSubmitTriggered.current = false;
          const form = document.getElementById("post-request-form") as HTMLFormElement;
          if (form) {
            form.requestSubmit();
          }
        }, 500);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Resume waiting screen if jobId param provided
  useEffect(() => {
    const resumeJobId = searchParams.get("jobId");
    if (resumeJobId) {
      const resumeJob = async () => {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 3);
        await supabase.from("jobs").update({ status: "open", expires_at: expiresAt.toISOString() }).eq("id", resumeJobId);

        const { data: job } = await supabase.from("jobs").select("*").eq("id", resumeJobId).single();
        if (job) {
          setTitle(job.title);
          setCategory(job.category);
          setJobId(job.id);
          setTimeLeft(180);
          setWizardStep("waiting");

          const mainCat = job.category.split(":")[0]?.trim() || job.category;
          const { count } = await supabase.from("expert_categories").select("*", { count: "exact", head: true }).ilike("category", `%${mainCat}%`);
          setOnlineCount(count || 0);

          const { data: existingQuotes } = await supabase.from("quotes").select("*").eq("job_id", resumeJobId).eq("status", "pending");
          if (existingQuotes) {
            const enriched = await Promise.all(existingQuotes.map(async (q) => {
              const { data: profile } = await supabase.from("profiles").select("display_name, rating_avg, total_sessions").eq("id", q.expert_id).single();
              return { ...q, expert_profile: profile };
            }));
            setQuotes(enriched as any);
          }
        }
      };
      resumeJob();
      return;
    }

    if (searchParams.get("category")) {
      const cat = searchParams.get("category")!;
      const broad = cat.split(":")[0]?.trim() || cat;
      setBroadCategory(broad);
      setCategory(cat);
      setWizardStep("details");
    } else if (searchParams.get("title") && !autoMatchTriggered.current) {
      // Auto-match: user typed a title from the hero input
      autoMatchTriggered.current = true;
      setWizardStep("auto-match");
      triggerAutoMatch(searchParams.get("title")!.trim());
    } else {
      // No params — show the choose-method screen
      setWizardStep("choose-method");
    }
  }, []);

  // ─── Interactive client tutorial (driver.js) ───
  const clientTourDriverRef = useRef<ReturnType<typeof driver> | null>(null);
  const clientTourActive = useRef(false);
  const clientTourChecked = useRef(false);

  // Auto-prompt tutorial for non-signed-in users, or first visit for signed-in users
  useEffect(() => {
    if (clientTourChecked.current) return;
    if (searchParams.get("jobId")) return;
    clientTourChecked.current = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;

      if (!uid) {
        // Always show tutorial for non-signed-in users
        clientTourActive.current = true;
        return;
      }

      // For signed-in users, only show once
      const key = `client_tutorial_prompted_${uid}`;
      if (localStorage.getItem(key) === "true") return;
      localStorage.setItem(key, "true");
      clientTourActive.current = true;
    };
    check();
  }, [searchParams]);

  // Show contextual tooltip when wizard step changes
  useEffect(() => {
    if (!clientTourActive.current) return;

    // Destroy previous
    clientTourDriverRef.current?.destroy();
    clientTourDriverRef.current = null;

    const showStep = () => {
      let steps: DriveStep[] = [];

      switch (wizardStep) {
        case "category":
          steps = [{
            element: "#tour-category-grid",
            popover: {
              title: "Pick a Category 👆",
              description: "Choose what you need help with. <strong>Click any category</strong> to continue!",
              side: "top" as const,
              align: "center" as const,
            },
          }];
          break;
        case "subcategory":
          steps = [{
            element: "#tour-subcategory-grid",
            popover: {
              title: "Choose a Specialty 🎯",
              description: "Pick the specific service you need — this helps us match you with the right experts. <strong>Click one</strong> to continue!",
              side: "top" as const,
              align: "center" as const,
            },
          }];
          break;
        case "ai-refine":
          steps = [{
            popover: {
              title: "Describe Your Idea ✨",
              description: "Type what you need and AI will find the best category and refine your request. Try it!",
              side: "bottom" as const,
              align: "center" as const,
            },
          }];
          break;
        case "details":
          steps = [
            {
              element: "#tour-title-input",
              popover: {
                title: "Write a Clear Title ✍️",
                description: "Be specific about what you need — better titles attract better quotes from experts!",
                side: "bottom" as const,
                align: "start" as const,
              },
            },
            {
              element: "#tour-deadline",
              popover: {
                title: "Set Delivery Time ⏱️",
                description: "Suggest how long the job should take. You can choose between minutes, hours, or days. Experts will propose their own timelines too.",
                side: "bottom" as const,
                align: "start" as const,
              },
            },
            {
              element: "#tour-description",
              popover: {
                title: "Add Details 📝",
                description: "The more context you provide, the more accurate quotes you'll receive. Include any requirements, links, or references.",
                side: "top" as const,
                align: "start" as const,
              },
            },
            {
              element: "#tour-submit-btn",
              popover: {
                title: "Submit Your Request! 🚀",
                description: "Click to post. Experts will be <strong>notified instantly</strong> and you'll start receiving quotes in seconds! It's <strong>free to post</strong>.",
                side: "top" as const,
                align: "center" as const,
              },
            },
          ];
          break;
        case "matching":
          steps = [{
            element: "#tour-go-live",
            popover: {
              title: "Request Posted! 🎉",
              description: "Experts are being notified right now. <strong>Click here</strong> to watch your live request and see quotes come in real-time!",
              side: "top" as const,
              align: "center" as const,
            },
          }];
          break;
      }

      if (steps.length === 0) return;

      const d = driver({
        showProgress: steps.length > 1,
        animate: true,
        allowClose: true,
        overlayColor: "hsl(0 0% 0% / 0.5)",
        stagePadding: 10,
        stageRadius: 12,
        popoverClass: "seller-tour-popover",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Got it 👍",
        progressText: `{{current}} / {{total}}`,
        steps,
        onDestroyStarted: () => {
          d.destroy();
          clientTourDriverRef.current = null;
        },
      } as Config);

      clientTourDriverRef.current = d;
      d.drive();
    };

    const timer = setTimeout(showStep, 450);
    return () => {
      clearTimeout(timer);
      clientTourDriverRef.current?.destroy();
      clientTourDriverRef.current = null;
    };
  }, [wizardStep]);

  // Mark tour complete + trigger cross-page tour when navigating to live request
  const handleGoToLiveRequest = () => {
    clientTourDriverRef.current?.destroy();
    clientTourActive.current = false;

    // Mark request-flow portion done, trigger cross-page
    if (jobId) {
      localStorage.setItem("client_tour_crosspage", "true");
      localStorage.setItem("client_tour_crosspage_step", "0");
      navigate(`/request/${jobId}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { clientTourDriverRef.current?.destroy(); };
  }, []);

  const handleSelectBroad = (id: string) => {
    setBroadCategory(id);
    setWizardStep("subcategory");
  };

  const handleSelectSub = (id: string) => {
    setCategory(id);
    setWizardStep("details");
  };

  const handleBack = () => {
    if (wizardStep === "choose-method") navigate("/");
    else if (wizardStep === "auto-match") { setAutoMatchResult(null); setUserIdea(""); setWizardStep("choose-method"); }
    else if (wizardStep === "category") setWizardStep("choose-method");
    else if (wizardStep === "subcategory") setWizardStep("category");
    else if (wizardStep === "ai-refine") {
      setAiResult(null);
      setWizardStep("category");
    }
    else if (wizardStep === "details") {
      if (aiResult) {
        setWizardStep("ai-refine");
      } else if (autoMatchResult) {
        setWizardStep("auto-match");
      } else {
        setWizardStep("subcategory");
      }
    }
    else navigate("/");
  };

  const triggerAutoMatch = async (inputTitle: string) => {
    setAutoMatchLoading(true);
    setAutoMatchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-refine-request", {
        body: { userIdea: inputTitle },
      });
      if (error) {
        // supabase SDK wraps non-2xx as FunctionsHttpError; extract actual status
        const status = (error as any)?.context?.status ?? (error as any)?.status;
        if (status === 402 || status === 429) {
          throw Object.assign(error, { _httpStatus: status });
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);
      if (data?.rejected) {
        toast({
          title: "This service isn't available",
          description: data.rejection_reason || "We couldn't match your request to any service on our platform. Try something else!",
          variant: "destructive",
        });
        setWizardStep("choose-method");
        return;
      }
      setAutoMatchResult(data);
    } catch (err: any) {
      console.error("Auto-match error:", err);
      const status = err?._httpStatus ?? err?.context?.status;
      const is402 = status === 402 || err?.message?.includes("402") || err?.message?.includes("credits depleted");
      const is429 = status === 429 || err?.message?.includes("429");
      toast({
        title: is429 ? "Too many requests" : "AI couldn't auto-detect a category",
        description: is429
          ? "Please wait a moment and try again."
          : is402
            ? "AI service is temporarily unavailable. Pick a category manually."
            : "No worries — pick one manually.",
        variant: "destructive",
      });
      setWizardStep("category");
    } finally {
      setAutoMatchLoading(false);
    }
  };

  const handleAcceptAutoMatch = () => {
    if (!autoMatchResult) return;
    setTitle(autoMatchResult.title);
    setDescription(autoMatchResult.description);
    setCategory(autoMatchResult.category);
    setBroadCategory(autoMatchResult.broad_category);
    setWizardStep("details");
  };

  const handleRejectAutoMatch = () => {
    setAutoMatchResult(null);
    setWizardStep("category");
  };

  const handleAiRefine = async () => {
    if (!userIdea.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-refine-request", {
        body: { userIdea: userIdea.trim() },
      });

      if (error) {
        const status = (error as any)?.context?.status ?? (error as any)?.status;
        if (status === 402 || status === 429) {
          throw Object.assign(error, { _httpStatus: status });
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      if (data?.rejected) {
        toast({
          title: "This service isn't available",
          description: data.rejection_reason || "We couldn't match your request to any service on our platform. Try something else!",
          variant: "destructive",
        });
        return;
      }

      setAiResult(data);
    } catch (err: any) {
      console.error("AI refine error:", err);
      const is402 = err?.message?.includes("402") || err?.context?.status === 402;
      const is429 = err?.message?.includes("429") || err?.context?.status === 429;
      toast({
        title: is429 ? "Too many requests" : "AI couldn't process your request",
        description: is429
          ? "Please wait a moment and try again."
          : is402
            ? "AI service is temporarily unavailable. Please pick a category manually."
            : err?.message || "Please try again or pick a category manually.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptAiSuggestion = () => {
    if (!aiResult) return;
    setTitle(aiResult.title);
    setDescription(aiResult.description);
    setCategory(aiResult.category);
    setBroadCategory(aiResult.broad_category);
    setWizardStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !title) return;
    setLoading(true);

    // Moderation check (with timeout so the button never hangs indefinitely)
    const textToCheck = `${title} ${description || ""}`.trim();
    let flagged = false;
    try {
      const moderationPromise = checkContent(textToCheck, "job request posting");
      const timeoutPromise = new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5000));
      flagged = await Promise.race([moderationPromise, timeoutPromise]);
    } catch {
      flagged = false; // fail open
    }
    if (flagged) {
      setLoading(false);
      return;
    }

    try {
      if (!userId) {
        setLoading(false);
        pendingSubmitRef.current = true;
        setShowAuthDialog(true);
        return;
      }
      // Always get fresh session to avoid stale userId after OAuth redirect
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const currentUserId = freshSession?.user?.id;
      if (!currentUserId) {
        setLoading(false);
        pendingSubmitRef.current = true;
        setShowAuthDialog(true);
        return;
      }
      setUserId(currentUserId);

      // Ban check
      const { data: profileCheck } = await supabase.from("profiles").select("is_banned").eq("id", currentUserId).single();
      if (profileCheck?.is_banned) {
        toast({ title: "Account suspended", description: "Your account has been suspended. You cannot post new requests.", variant: "destructive" });
        setLoading(false);
        return;
      }

      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 3);

      const { data, error } = await supabase
        .from("jobs")
        .insert({
          buyer_id: currentUserId,
          title,
          description: description || null,
          category,
          budget_min: 5,
          budget_max: 50,
          deadline_minutes: deadlineUnit === "days" ? deadlineValue * 1440 : deadlineUnit === "hours" ? deadlineValue * 60 : deadlineValue,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Job insert error:", error);
        toast({ title: "Error posting request", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Fetch online sellers for this category
      const catForSearch = category.split(":")[0]?.trim() || category;
      const { data: expertCats } = await supabase
        .from("expert_categories")
        .select("user_id")
        .ilike("category", `%${catForSearch}%`);

      let onlineSellers = 0;
      let avgResponseMin = 5;

      if (expertCats && expertCats.length > 0) {
        const uniqueIds = [...new Set(expertCats.map(e => e.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("is_online, response_time_minutes")
          .in("id", uniqueIds)
          .eq("is_online", true);

        onlineSellers = profiles?.length || 0;
        if (profiles && profiles.length > 0) {
          const times = profiles.map(p => p.response_time_minutes || 5);
          avgResponseMin = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        }
      }

      setOnlineCount(onlineSellers);
      setJobId(data.id);
      setMatchingData({ onlineSellers, avgResponseMin });
      setWizardStep("matching");
      setLoading(false);
    } catch (err: any) {
      console.error("Submit error:", err);
      toast({ title: "Error posting request", description: err?.message || "Something went wrong", variant: "destructive" });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`quotes-${jobId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotes", filter: `job_id=eq.${jobId}` },
        async (payload) => {
          const quote = payload.new as any;
          const { data: profile } = await supabase.from("profiles").select("display_name, rating_avg, total_sessions").eq("id", quote.expert_id).single();
          setQuotes((prev) => [...prev, { ...quote, expert_profile: profile }]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  useEffect(() => {
    if (wizardStep !== "waiting") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [wizardStep]);

  const handleAcceptQuote = async (quote: Quote) => {
    if (!jobId) return;
    const { error: jobError } = await supabase.from("jobs").update({ status: "accepted", accepted_quote_id: quote.id }).eq("id", jobId);
    const { error: quoteError } = await supabase.from("quotes").update({ status: "accepted" }).eq("id", quote.id);
    if (jobError || quoteError) { toast({ title: "Error accepting quote", variant: "destructive" }); return; }
    toast({ title: "Expert hired! 🎉", description: `${quote.expert_profile?.display_name || "Expert"} is on the job.` });

    // Email seller: quote accepted (fire-and-forget)
    supabase.functions.invoke("send-order-email", { body: { event: "quote_accepted", jobId } }).catch(console.error);

    navigate("/dashboard");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const progressPercent = ((180 - timeLeft) / 180) * 100;

  const stepNumber = wizardStep === "choose-method" ? 0 : wizardStep === "auto-match" ? 1 : wizardStep === "category" ? 1 : wizardStep === "subcategory" ? 2 : wizardStep === "ai-refine" ? 2 : wizardStep === "details" ? 3 : 3;
  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-10 max-w-4xl">

        {/* Step indicator for wizard steps */}
        {wizardStep !== "waiting" && wizardStep !== "auto-match" && wizardStep !== "choose-method" && (
          <div className="mx-auto max-w-3xl mb-8 animate-fade-in">
            <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex items-center gap-3 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    s < stepNumber ? "bg-primary text-primary-foreground" :
                    s === stepNumber ? "bg-primary text-primary-foreground shadow-glow" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {s < stepNumber ? <Check className="h-4 w-4" /> : s}
                  </div>
                  {s < 3 && <div className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${s < stepNumber ? "bg-primary" : "bg-border"}`} />}
                </div>
              ))}
              <span className="ml-3 text-sm text-muted-foreground">
                {wizardStep === "category" ? "Choose a category" : wizardStep === "subcategory" ? "Pick a specialty" : wizardStep === "ai-refine" ? "Describe your idea" : wizardStep === "details" ? "Describe your request" : "Matching..."}
              </span>
            </div>
          </div>
        )}
        {/* Choose method: AI or Manual */}
        {wizardStep === "choose-method" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <Button variant="ghost" className="mb-4 md:mb-6 gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/[0.06] text-sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="mb-6 md:mb-10 text-center">
              <h1 className="mb-2 md:mb-3 text-2xl md:text-3xl font-bold text-foreground">How would you like to start?</h1>
              <p className="text-sm md:text-lg text-muted-foreground">Choose your preferred way to post a task.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* AI Auto-Match Option */}
              <button
                onClick={() => {
                  setWizardStep("auto-match");
                }}
                className="group relative flex flex-col items-start gap-4 rounded-xl border border-primary/30 bg-primary/[0.04] p-6 text-left transition-all duration-300 hover:border-primary/60 hover:bg-primary/[0.08] hover:-translate-y-1"
              >
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform duration-300 group-hover:scale-110">
                  <Sparkles className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-base md:text-lg font-semibold text-foreground mb-1">AI Auto-Match</p>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Describe what you need and AI will find the best category and refine your request.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Recommended</span>
                </div>
              </button>

              {/* Manual Pick Option */}
              <button
                onClick={() => setWizardStep("category")}
                className="group relative flex flex-col items-start gap-3 md:gap-4 rounded-xl border border-border bg-card p-4 md:p-6 text-left transition-all duration-300 hover:border-primary/40 hover:bg-card/80 hover:-translate-y-1"
              >
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:text-foreground">
                  <Users className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div>
                  <p className="text-base md:text-lg font-semibold text-foreground mb-1">Pick Category Manually</p>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Browse categories and choose the exact specialty you need.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        
        {/* Auto-match: AI detecting category from title */}
        {wizardStep === "auto-match" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">AI Powered</span>
              </div>
              <h1 className="mb-3 text-3xl font-bold text-foreground">
                {autoMatchLoading ? "Finding the right category..." : autoMatchResult ? "Here's what AI found" : "What do you need help with?"}
              </h1>
              {!autoMatchLoading && !autoMatchResult && (
                <p className="text-muted-foreground">Describe your task and AI will handle the rest.</p>
              )}
              {(autoMatchLoading || autoMatchResult) && title && (
                <p className="text-muted-foreground">
                  Based on: <span className="text-foreground font-medium">"{title}"</span>
                </p>
              )}
            </div>

            {/* Input form — shown when no auto-match is running or completed */}
            {!autoMatchLoading && !autoMatchResult && (
              <div className="space-y-4 animate-fade-in">
                <div className="relative">
                  <Textarea
                    value={userIdea}
                    onChange={(e) => setUserIdea(e.target.value)}
                    className="min-h-[120px] text-base resize-none"
                    placeholder=" "
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && userIdea.trim()) {
                        e.preventDefault();
                        setTitle(userIdea.trim());
                        triggerAutoMatch(userIdea.trim());
                      }
                    }}
                  />
                  {!userIdea && (
                    <span
                      key={placeholderIndex}
                      className="pointer-events-none absolute left-3 top-[9px] text-base text-muted-foreground/60 animate-fade-in"
                      style={{ animationDuration: "500ms" }}
                    >
                      {ROTATING_PLACEHOLDERS[placeholderIndex]}
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => {
                    if (userIdea.trim()) {
                      setTitle(userIdea.trim());
                      triggerAutoMatch(userIdea.trim());
                    }
                  }}
                  disabled={!userIdea.trim()}
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Let AI find the best match
                </Button>
              </div>
            )}

            {autoMatchLoading && (
              <Card className="border-primary/20 bg-card/60 backdrop-blur-xl">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <Wand2 className="absolute inset-0 m-auto h-6 w-6 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-sm">AI is analyzing your request...</p>
                </CardContent>
              </Card>
            )}

            {autoMatchResult && !autoMatchLoading && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">AI matched your request</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{autoMatchResult.clarifying_note}</p>
                  </div>
                </div>

                <Card className="border-primary/20 bg-card/60 backdrop-blur-xl">
                  <CardContent className="pt-6 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Detected Category</label>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                          <Zap className="h-3.5 w-3.5" />
                          {autoMatchResult.category}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Refined Title</label>
                      <p className="text-foreground font-semibold text-lg">{autoMatchResult.title}</p>
                    </div>

                    {autoMatchResult.description && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Description</label>
                        <p className="text-muted-foreground text-sm leading-relaxed">{autoMatchResult.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">Does this match what you need?</p>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAcceptAutoMatch}
                    className="flex-1 gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500"
                  >
                    <Check className="h-4 w-4" />
                    Yes, continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRejectAutoMatch}
                    className="flex-1 gap-2"
                  >
                    No, pick manually
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}


        {wizardStep === "category" && (
          <div className="mx-auto max-w-3xl animate-fade-in relative">
            <Button
              variant="outline"
              size="sm"
              className="absolute right-0 top-0 gap-2 border-primary/30 text-primary hover:bg-primary/10 z-10"
              onClick={() => {
                clientTourActive.current = true;
                clientTourDriverRef.current?.destroy();
                clientTourDriverRef.current = null;
                const d = driver({
                  popoverClass: "seller-tour-popover",
                  showButtons: ["close"],
                  steps: [{
                    element: "#tour-category-grid",
                    popover: {
                      title: "Pick a Category 👆",
                      description: "Choose what you need help with. <strong>Click any category</strong> to continue!",
                      side: "top" as const,
                      align: "center" as const,
                    },
                  }],
                });
                d.drive();
                clientTourDriverRef.current = d;
              }}
            >
              <GraduationCap className="h-4 w-4" />
              Basic Tutorial
            </Button>
            <div className="mb-5 md:mb-8">
              <p className="mb-1 md:mb-2 text-xs md:text-sm font-semibold uppercase tracking-widest text-primary">Step 1</p>
              <h1 className="mb-1 md:mb-2 text-xl md:text-3xl font-bold text-foreground">What do you need help with?</h1>
              <p className="text-xs md:text-base text-muted-foreground">Choose a category to find the right experts.</p>
            </div>

            <div id="tour-category-grid" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {BROAD_CATEGORIES.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectBroad(cat.id)}
                    className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl md:rounded-2xl border border-border bg-card p-3 md:p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-glow hover:-translate-y-1 animate-slide-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl bg-primary/20 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/30">
                      <Icon className="h-5 w-5 md:h-7 md:w-7" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs md:text-base font-semibold text-foreground">{cat.label}</p>
                      <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs text-muted-foreground leading-relaxed hidden sm:block">{cat.description}</p>
                    </div>
                    <ChevronRight className="absolute right-2 top-2 md:right-3 md:top-3 h-3 w-3 md:h-4 md:w-4 text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5" />
                  </button>
                );
              })}

              {/* Custom Request - AI powered */}
              <button
                onClick={() => setWizardStep("ai-refine")}
                className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl md:rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] p-3 md:p-6 transition-all duration-300 hover:border-primary/60 hover:shadow-glow hover:-translate-y-1 animate-slide-up col-span-2 lg:col-span-4"
                style={{ animationDelay: `${BROAD_CATEGORIES.length * 60}ms` }}
              >
                <div className="flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl bg-primary/20 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/30">
                  <Wand2 className="h-5 w-5 md:h-7 md:w-7" />
                </div>
                <div className="text-center">
                  <p className="text-xs md:text-base font-semibold text-foreground">Custom Request</p>
                  <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs text-muted-foreground leading-relaxed">AI finds the best category</p>
                </div>
                <div className="absolute right-2 top-2 md:right-4 md:top-4 flex items-center gap-1 md:gap-1.5 rounded-full bg-primary/10 px-2 md:px-2.5 py-0.5 md:py-1">
                  <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary" />
                  <span className="text-[8px] md:text-[10px] font-semibold text-primary uppercase tracking-wider">AI</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Subcategory */}
        {wizardStep === "subcategory" && (
          <div className="mx-auto max-w-3xl animate-fade-in">
            <div className="mb-5 md:mb-8">
              <p className="mb-1 md:mb-2 text-xs md:text-sm font-semibold uppercase tracking-widest text-primary">Step 2</p>
              <h1 className="mb-1 md:mb-2 text-xl md:text-3xl font-bold text-foreground">
                What kind of <span className="text-primary">{broadCategory}</span>?
              </h1>
              <p className="text-xs md:text-base text-muted-foreground">Pick a specialty so we can match you with the best experts.</p>
            </div>

            <div id="tour-subcategory-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {(SUBCATEGORIES[broadCategory] || []).map((sub, i) => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectSub(sub.id)}
                    className="group flex items-center gap-3 md:gap-4 rounded-xl md:rounded-2xl border border-border bg-card p-3 md:p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-glow hover:-translate-y-1 animate-slide-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex h-9 w-9 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg md:rounded-xl bg-primary/20 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/30">
                      <Icon className="h-4 w-4 md:h-6 md:w-6" />
                    </div>
                    <span className="text-sm md:text-base font-semibold text-foreground">{sub.label}</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground/40 shrink-0 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5" />
                  </button>
                );
              })}
              {/* Custom Request option */}
              <button
                onClick={() => handleSelectSub(`${broadCategory}: Custom`)}
                className="group flex items-center gap-3 md:gap-4 rounded-xl md:rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-3 md:p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-glow hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${(SUBCATEGORIES[broadCategory]?.length || 0) * 40}ms` }}
              >
                <div className="flex h-9 w-9 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg md:rounded-xl bg-primary/[0.12] text-primary transition-transform duration-300 group-hover:scale-110">
                  <MessageSquarePlus className="h-4 w-4 md:h-6 md:w-6" />
                </div>
                <div className="text-left">
                  <span className="text-sm md:text-base font-semibold text-foreground">Custom Request</span>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Something else in {broadCategory}</p>
                </div>
                <ChevronRight className="ml-auto h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground/40 shrink-0 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* AI Refine Step */}
        {wizardStep === "ai-refine" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Step 2</p>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Describe your idea</h1>
              <p className="text-muted-foreground">Tell us what you need — AI will refine it and find the best category.</p>
            </div>

            {/* Input area */}
            <Card className="border-border bg-card/60 backdrop-blur-xl mb-6">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <PencilLine className="h-4 w-4 text-primary" />
                    What do you need help with?
                  </label>
                  <Textarea
                    placeholder="e.g. I want someone to build me a custom Discord bot that tracks server activity and sends daily reports..."
                    value={userIdea}
                    onChange={(e) => setUserIdea(e.target.value)}
                    className="min-h-28 bg-background/60 border-border focus:border-primary/40 text-[15px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{userIdea.length}/500</p>
                </div>

                <Button
                  onClick={handleAiRefine}
                  disabled={!userIdea.trim() || aiLoading}
                  className="w-full gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI is thinking...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Refine with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* AI Result */}
            {aiResult && (
              <div className="space-y-4 animate-fade-in">
                {/* Clarifying note */}
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">AI understood your request</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiResult.clarifying_note}</p>
                  </div>
                </div>

                {/* Suggested fields */}
                <Card className="border-primary/20 bg-card/60 backdrop-blur-xl">
                  <CardContent className="pt-6 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Category</label>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                          <Zap className="h-3.5 w-3.5" />
                          {aiResult.category}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Suggested Title</label>
                      <p className="text-foreground font-semibold text-lg">{aiResult.title}</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Refined Description</label>
                      <p className="text-muted-foreground text-sm leading-relaxed">{aiResult.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAcceptAiSuggestion}
                    className="flex-1 gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500"
                  >
                    <Check className="h-4 w-4" />
                    Use this & continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAiRefine}
                    disabled={aiLoading}
                    className="gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Details form */}
        {wizardStep === "details" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Step 3</p>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Describe your request</h1>
              <p className="text-muted-foreground">
                Category: <span className="text-primary font-medium">{category}</span>
              </p>
            </div>

            <form id="post-request-form" onSubmit={handleSubmit} className="space-y-6">
              <Card className="border-border bg-card/60 backdrop-blur-xl">
                <CardContent className="space-y-5 pt-6">
                  <div id="tour-title-input" className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input placeholder={TITLE_PLACEHOLDERS[category] || BROAD_PLACEHOLDERS[broadCategory] || 'e.g. "Describe what you need"'} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} className="bg-background/60 border-border focus:border-primary/40" />
                  </div>

                   <div id="tour-deadline" className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Suggested Delivery Time</label>
                    <div className="flex rounded-lg border border-border overflow-hidden bg-background/60 w-fit">
                      {(["minutes", "hours", "days"] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => {
                            setDeadlineUnit(unit);
                            const max = unit === "minutes" ? 60 : unit === "hours" ? 23 : 30;
                            setDeadlineValue((prev) => Math.min(prev, max));
                          }}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            deadlineUnit === unit
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={1}
                        max={deadlineUnit === "minutes" ? 60 : deadlineUnit === "hours" ? 23 : 30}
                        step={1}
                        value={[deadlineValue]}
                        onValueChange={([v]) => setDeadlineValue(v)}
                        className="flex-1"
                      />
                      <span className="text-sm font-semibold text-foreground w-20 text-right tabular-nums">
                        {deadlineValue} {deadlineUnit}
                      </span>
                    </div>
                  </div>

                  <div id="tour-description" className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description</label>
                    <Textarea placeholder="Describe your issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 bg-background/60 border-border focus:border-primary/40" maxLength={1000} />
                  </div>

                  <CategoryTemplateFields
                    category={category}
                    templateData={templateData}
                    onChange={(key, value) => setTemplateData(prev => ({ ...prev, [key]: value }))}
                  />

                </CardContent>
              </Card>

              <Button id="tour-submit-btn" type="submit" size="lg" className="w-full gap-2 shadow-glow hover:shadow-glow-lg transition-shadow duration-500" disabled={loading || !title}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                Post Request & Notify Experts
              </Button>

              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary/60" /> Escrow protected</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary/60" /> ~90s avg response</span>
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary/60" /> Free to post</span>
              </div>
            </form>
          </div>
        )}

        {/* Matching interstitial */}
        {wizardStep === "matching" && matchingData && (
          <div className="mx-auto max-w-lg animate-fade-in text-center py-8">
            <div className="mb-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-10 w-10 text-primary animate-fade-in" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in [animation-delay:100ms]">
                Request Posted!
              </h1>
              <p className="text-muted-foreground animate-fade-in [animation-delay:200ms]">
                We're notifying experts in <span className="font-semibold text-foreground">{category}</span>
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <Card className="border-primary/20 bg-primary/[0.04] animate-fade-in [animation-delay:300ms]">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-chart-2/10">
                    <Users className="h-6 w-6 text-chart-2" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">
                      {matchingData.onlineSellers}
                      <span className="text-base font-normal text-muted-foreground ml-1">
                        online seller{matchingData.onlineSellers !== 1 ? "s" : ""}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {matchingData.onlineSellers > 0
                        ? `Available right now for ${category.split(":")[0]?.trim()}`
                        : "No sellers online — they'll be notified when they come back"}
                    </p>
                  </div>
                  {matchingData.onlineSellers > 0 && (
                    <span className="ml-auto h-3 w-3 rounded-full bg-chart-2 animate-pulse shrink-0" />
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/60 animate-fade-in [animation-delay:400ms]">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">
                      ~{matchingData.avgResponseMin}
                      <span className="text-base font-normal text-muted-foreground ml-1">minutes</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Estimated time for first offer
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              id="tour-go-live"
              size="lg"
              className="gap-2 shadow-glow w-full animate-fade-in [animation-delay:500ms]"
              onClick={handleGoToLiveRequest}
            >
              Go to Live Request <Zap className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3 animate-fade-in [animation-delay:600ms]">
              You'll see offers appear in real-time
            </p>
          </div>
        )}

        {/* Waiting screen */}
        {wizardStep === "waiting" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <div className="mb-10 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-5 py-2.5 animate-fade-in">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </span>
                <span className="text-sm font-semibold text-primary">
                  Notifying {onlineCount} experts in {category.split(":")[0]?.trim()}
                </span>
              </div>
              <h1 className="mb-3 text-3xl font-bold text-foreground animate-fade-in [animation-delay:100ms]">{title}</h1>
              <p className="text-muted-foreground animate-fade-in [animation-delay:200ms]">Experts will propose their own timelines</p>

              <div className="mt-6 mx-auto max-w-md animate-fade-in [animation-delay:300ms]">
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                </div>
                {timeLeft > 0 ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary/60" />
                    <span className="text-sm font-mono">{formatTime(timeLeft)} remaining</span>
                  </div>
                ) : quotes.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm">
                    No experts available right now. Try a broader category.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              {quotes.length === 0 && timeLeft > 0 && (
                <Card className="border-dashed border-border/30 bg-card/30">
                  <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                    <div className="relative mb-6">
                      <div className="h-16 w-16 rounded-2xl bg-primary/[0.08] flex items-center justify-center">
                        <Send className="h-7 w-7 text-primary/60" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping opacity-40" />
                    </div>
                    <p className="font-semibold text-foreground mb-1">Waiting for expert responses...</p>
                    <p className="text-sm">Quotes usually arrive within 90 seconds</p>
                  </CardContent>
                </Card>
              )}

              {quotes.map((quote, i) => (
                <Card key={quote.id} className="border-border/30 bg-card/60 backdrop-blur-xl transition-all duration-500 hover:shadow-glow hover:-translate-y-1 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <CardContent className="flex items-center gap-5 p-6">
                    <Avatar className="h-14 w-14 border border-border/30">
                      <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold">
                        {quote.expert_profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{quote.expert_profile?.display_name || "Expert"}</h3>
                        {quote.expert_profile?.rating_avg ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span className="text-xs text-muted-foreground font-medium">{quote.expert_profile.rating_avg.toFixed(1)}</span>
                          </div>
                        ) : null}
                        {quote.expert_profile?.total_sessions ? (
                          <span className="text-xs text-muted-foreground">· {quote.expert_profile.total_sessions} jobs</span>
                        ) : null}
                      </div>
                      {quote.message && <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{quote.message}</p>}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary/60" /> {quote.estimated_minutes >= 1440 ? `${Math.round(quote.estimated_minutes / 1440)} day${Math.round(quote.estimated_minutes / 1440) !== 1 ? "s" : ""}` : quote.estimated_minutes >= 60 ? `${Math.round(quote.estimated_minutes / 60)} hour${Math.round(quote.estimated_minutes / 60) !== 1 ? "s" : ""}` : `${quote.estimated_minutes} min`}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground mb-2">€{quote.price}</p>
                      <Button size="sm" className="gap-1.5 shadow-glow hover:shadow-glow-lg transition-shadow" onClick={() => handleAcceptQuote(quote)}>
                        <Check className="h-3.5 w-3.5" /> Hire
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </main>
      <QuickAuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultTab="signup"
        onSuccess={() => setShowAuthDialog(false)}
      />
    </div>
  );
};

export default PostRequest;
