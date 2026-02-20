import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  X, ChevronRight, ChevronLeft, LayoutDashboard, Send, MessageSquare,
  Package, Wallet, Settings, Sparkles, GraduationCap, PartyPopper,
  Target, Clock, Shield, DollarSign, CheckCircle2, Star, Loader2,
  FileText, ArrowRight, Zap, Trophy,
} from "lucide-react";

/* ─────────────────── Step definitions ─────────────────── */

type StepType = "info" | "demo";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  tip?: string;
  icon: any;
  route: string;
  type: StepType;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Selling on Duxio! 🎉",
    description: "This quick tour will walk you through everything you need to know — and let you complete a demo order so you're ready from day one.",
    tip: "You can replay this tutorial anytime from your Expert Dashboard.",
    icon: GraduationCap,
    route: "/dashboard",
    type: "info",
  },
  {
    id: "dashboard",
    title: "Your Expert Dashboard",
    description: "Switch between Client and Expert views using the toggle at the top. The Expert view shows open requests from buyers that match your subscribed categories.",
    tip: "Subscribe to categories in Settings so relevant jobs appear here.",
    icon: LayoutDashboard,
    route: "/dashboard",
    type: "info",
  },
  // ── Interactive demo steps ──
  {
    id: "demo_job",
    title: "Step 1: A New Request Arrives",
    description: "Here's an open request from a buyer. Review the details and click 'Send Quote' to submit your offer.",
    icon: FileText,
    route: "/dashboard",
    type: "demo",
  },
  {
    id: "demo_quote",
    title: "Step 2: Set Your Price",
    description: "Enter your price and delivery time. A competitive price with a short delivery window wins more jobs!",
    icon: Send,
    route: "/dashboard",
    type: "demo",
  },
  {
    id: "demo_accepted",
    title: "Step 3: Quote Accepted! 🎉",
    description: "The buyer chose your quote! Funds are now held in escrow. You can start working and chat with the buyer.",
    icon: CheckCircle2,
    route: "/dashboard",
    type: "demo",
  },
  {
    id: "demo_chat",
    title: "Step 4: Chat with the Buyer",
    description: "Use the inbox to discuss details, ask questions, and share files. Clear communication leads to better reviews!",
    icon: MessageSquare,
    route: "/dashboard",
    type: "demo",
  },
  {
    id: "demo_deliver",
    title: "Step 5: Deliver Your Work",
    description: "Once you're done, mark the order as delivered. Always include proof (screenshots, files, recordings).",
    icon: Package,
    route: "/dashboard",
    type: "demo",
  },
  {
    id: "demo_paid",
    title: "Step 6: You Got Paid! 💰",
    description: "The buyer confirmed your delivery! Funds have been released to your wallet minus the 5% platform fee.",
    icon: Trophy,
    route: "/dashboard",
    type: "demo",
  },
  // ── Remaining info steps ──
  {
    id: "wallet",
    title: "Earnings & Withdrawals",
    description: "Your earnings appear here after buyers approve your delivery. Funds auto-release after 3 days if there's no dispute. Withdraw via PayPal or crypto.",
    tip: "The platform takes a 5% fee on completed jobs. The rest is yours!",
    icon: Wallet,
    route: "/wallet",
    type: "info",
  },
  {
    id: "settings",
    title: "Settings & Availability",
    description: "Set your hourly rate, availability schedule, timezone, skills, and bio. A complete profile with a photo attracts more buyers.",
    tip: "Toggle your availability to control when you appear as 'Online' to buyers.",
    icon: Settings,
    route: "/settings",
    type: "info",
  },
  {
    id: "done",
    title: "You're All Set! 🚀",
    description: "You've completed the seller basics and your first demo order. Subscribe to categories, keep your profile updated, and start sending real quotes!",
    tip: "Top sellers respond within 2 minutes and maintain a 4.5+ rating.",
    icon: PartyPopper,
    route: "/dashboard",
    type: "info",
  },
];

/* ─────────────────── Mock data ─────────────────── */

const MOCK_JOB = {
  title: "Fix my Minecraft server — keep crashing on startup",
  category: "Gaming",
  subcategory: "Minecraft: Server Setup",
  budget: 25,
  deadline: "2 hours",
  buyer: "Alex_M",
  description: "My Minecraft server keeps crashing when players join. Need someone to check the logs, fix the issue, and make sure it stays stable. Running Paper 1.21 with about 15 plugins.",
  posted: "2 min ago",
};

const MOCK_MESSAGES = [
  { from: "buyer", text: "Hey! Can you start right away? The server is down and my friends are waiting 😅", time: "Just now" },
];

/* ─────────────────── Storage keys ─────────────────── */

const STORAGE_KEY = "seller_tutorial_completed";
const ACTIVE_KEY = "seller_tutorial_active";
const STEP_KEY = "seller_tutorial_step";

/* ─────────────────── Component ─────────────────── */

interface SellerTutorialProps {
  userId?: string;
  autoStart?: boolean;
  onComplete?: () => void;
}

const SellerTutorial = ({ userId: propUserId, autoStart = false, onComplete }: SellerTutorialProps) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userId, setUserId] = useState(propUserId || "");
  const navigate = useNavigate();
  const location = useLocation();

  // Demo state
  const [demoPrice, setDemoPrice] = useState("15");
  const [demoMinutes, setDemoMinutes] = useState("30");
  const [demoMessage, setDemoMessage] = useState("");
  const [demoChatInput, setDemoChatInput] = useState("");
  const [demoChatMessages, setDemoChatMessages] = useState(MOCK_MESSAGES);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoAutoAdvance, setDemoAutoAdvance] = useState(false);

  // Get userId from auth if not provided
  useEffect(() => {
    if (!propUserId) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) setUserId(session.user.id);
      });
    }
  }, [propUserId]);

  // Auto-start on first seller login
  useEffect(() => {
    if (autoStart && userId) {
      const completed = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (!completed) {
        setIsActive(true);
        setCurrentStep(0);
        localStorage.setItem(ACTIVE_KEY, "true");
        localStorage.setItem(STEP_KEY, "0");
      }
    }
  }, [autoStart, userId]);

  // Resume across navigation
  useEffect(() => {
    const active = localStorage.getItem(ACTIVE_KEY);
    const step = localStorage.getItem(STEP_KEY);
    if (active === "true" && step) {
      setIsActive(true);
      setCurrentStep(parseInt(step, 10));
    }
  }, [location.pathname]);

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const goToStep = useCallback((nextStep: number) => {
    setCurrentStep(nextStep);
    localStorage.setItem(STEP_KEY, nextStep.toString());
    const targetRoute = TUTORIAL_STEPS[nextStep].route;
    if (location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  }, [location.pathname, navigate]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      goToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, "true");
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(STEP_KEY);
    if (location.pathname !== "/dashboard") navigate("/dashboard");
    onComplete?.();
  };

  const handleSkip = () => handleComplete();

  // Demo action handlers
  const handleDemoSendQuote = () => {
    if (!demoPrice) return;
    setDemoLoading(true);
    setTimeout(() => {
      setDemoLoading(false);
      handleNext(); // → demo_accepted
    }, 800);
  };

  const handleDemoAccepted = () => {
    // Auto-advance after a moment
    handleNext(); // → demo_chat
  };

  const handleDemoChatSend = () => {
    if (!demoChatInput.trim()) return;
    setDemoChatMessages(prev => [...prev, { from: "you", text: demoChatInput, time: "Now" }]);
    setDemoChatInput("");
    // Buyer auto-replies
    setTimeout(() => {
      setDemoChatMessages(prev => [...prev, { from: "buyer", text: "Awesome, thanks! Take your time 🙌", time: "Now" }]);
    }, 1200);
  };

  const handleDemoDeliver = () => {
    setDemoLoading(true);
    setTimeout(() => {
      setDemoLoading(false);
      handleNext(); // → demo_paid
    }, 1000);
  };

  // Custom event to start tutorial
  useEffect(() => {
    const handler = () => {
      // Reset demo state
      setDemoPrice("15");
      setDemoMinutes("30");
      setDemoMessage("");
      setDemoChatInput("");
      setDemoChatMessages(MOCK_MESSAGES);
      setDemoLoading(false);

      setIsActive(true);
      setCurrentStep(0);
      localStorage.setItem(ACTIVE_KEY, "true");
      localStorage.setItem(STEP_KEY, "0");
      if (location.pathname !== "/dashboard") navigate("/dashboard");
    };
    window.addEventListener("start-seller-tutorial", handler);
    return () => window.removeEventListener("start-seller-tutorial", handler);
  }, [location.pathname, navigate]);

  if (!isActive || !step) return null;

  const StepIcon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const isDemo = step.type === "demo";

  /* ─────────────────── Demo UI renderers ─────────────────── */

  const renderDemoJob = () => (
    <div className="space-y-3">
      {/* Mock job card */}
      <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{MOCK_JOB.title}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">{MOCK_JOB.category}</Badge>
              <Badge variant="outline" className="text-[10px] border-primary/20 text-primary/80">{MOCK_JOB.subcategory}</Badge>
            </div>
          </div>
          <Badge className="shrink-0 text-xs bg-primary/10 text-primary border-0">€{MOCK_JOB.budget}</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{MOCK_JOB.description}</p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {MOCK_JOB.posted}</span>
          <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {MOCK_JOB.deadline}</span>
        </div>
      </div>
      <Button onClick={handleNext} className="w-full gap-2 shadow-glow">
        <Send className="h-4 w-4" /> Send Quote
      </Button>
    </div>
  );

  const renderDemoQuote = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Your Price (€)</label>
          <Input
            type="number"
            value={demoPrice}
            onChange={e => setDemoPrice(e.target.value)}
            className="bg-background/60 border-border h-9 text-sm"
            min={1}
            max={25}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Delivery Time (min)</label>
          <Input
            type="number"
            value={demoMinutes}
            onChange={e => setDemoMinutes(e.target.value)}
            className="bg-background/60 border-border h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Message (optional)</label>
          <Textarea
            placeholder="I can fix this right away..."
            value={demoMessage}
            onChange={e => setDemoMessage(e.target.value)}
            className="bg-background/60 border-border text-xs resize-none"
            rows={2}
          />
        </div>
      </div>
      <Button onClick={handleDemoSendQuote} disabled={!demoPrice || demoLoading} className="w-full gap-2 shadow-glow">
        {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {demoLoading ? "Sending..." : "Send Quote"}
      </Button>
    </div>
  );

  const renderDemoAccepted = () => (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-center space-y-2">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="font-semibold text-foreground text-sm">Quote Accepted!</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{MOCK_JOB.buyer}</span> accepted your €{demoPrice} quote.
          Funds are now held in escrow.
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> Escrow protected</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {demoMinutes} min delivery</span>
        </div>
      </div>
      <Button onClick={handleDemoAccepted} className="w-full gap-2 shadow-glow">
        <MessageSquare className="h-4 w-4" /> Open Chat
      </Button>
    </div>
  );

  const renderDemoChat = () => (
    <div className="space-y-3">
      {/* Mock chat */}
      <div className="rounded-lg border border-border bg-background/40 p-2 space-y-2 max-h-[140px] overflow-y-auto">
        {demoChatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "you" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
              msg.from === "you"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {msg.from === "buyer" && (
                <p className="font-medium text-[10px] mb-0.5 opacity-70">{MOCK_JOB.buyer}</p>
              )}
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Type a message..."
          value={demoChatInput}
          onChange={e => setDemoChatInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleDemoChatSend()}
          className="bg-background/60 border-border h-8 text-xs flex-1"
        />
        <Button size="sm" onClick={handleDemoChatSend} disabled={!demoChatInput.trim()} className="h-8 px-3">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Button onClick={handleNext} variant="outline" className="w-full gap-2 text-xs h-8">
        Continue to Delivery <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const renderDemoDeliver = () => (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">{MOCK_JOB.title}</p>
          <Badge className="text-[10px] bg-primary/10 text-primary border-0">Ongoing</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> €{demoPrice}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {demoMinutes} min</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Buyer: <span className="text-foreground">{MOCK_JOB.buyer}</span>
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-primary/20 bg-primary/[0.03] p-2.5">
        <p className="text-[10px] text-muted-foreground text-center">
          💡 In a real order, you'd upload screenshots or files as proof of completion before marking as delivered.
        </p>
      </div>
      <Button onClick={handleDemoDeliver} disabled={demoLoading} className="w-full gap-2 shadow-glow">
        {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {demoLoading ? "Delivering..." : "Mark as Delivered"}
      </Button>
    </div>
  );

  const earnings = demoPrice ? (parseFloat(demoPrice) * 0.95).toFixed(2) : "0.00";
  const fee = demoPrice ? (parseFloat(demoPrice) * 0.05).toFixed(2) : "0.00";

  const renderDemoPaid = () => (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4 text-center space-y-2">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
        </div>
        <p className="font-bold text-foreground">You earned €{earnings}!</p>
        <div className="flex items-center justify-center gap-1">
          {[1,2,3,4,5].map(s => (
            <Star key={s} className="h-4 w-4 text-primary fill-primary" />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          "{MOCK_JOB.buyer}" left a 5-star review. Buyer confirmed delivery.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div className="rounded-md bg-background/60 p-2">
            <p className="text-muted-foreground">Quote Price</p>
            <p className="font-semibold text-foreground">€{demoPrice}</p>
          </div>
          <div className="rounded-md bg-background/60 p-2">
            <p className="text-muted-foreground">Platform Fee (5%)</p>
            <p className="font-semibold text-foreground">-€{fee}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDemoContent = () => {
    switch (step.id) {
      case "demo_job": return renderDemoJob();
      case "demo_quote": return renderDemoQuote();
      case "demo_accepted": return renderDemoAccepted();
      case "demo_chat": return renderDemoChat();
      case "demo_deliver": return renderDemoDeliver();
      case "demo_paid": return renderDemoPaid();
      default: return null;
    }
  };

  /* ─────────────────── Render ─────────────────── */

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[90]" />

      {/* Tutorial card */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-24px)] max-w-lg animate-slide-up">
        <Card className="border-primary/20 shadow-glow bg-card/95 backdrop-blur-xl">
          <CardContent className="p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <StepIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm leading-tight">{step.title}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                      {currentStep + 1}/{TUTORIAL_STEPS.length}
                    </Badge>
                    {isDemo && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                        Interactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-destructive/10" onClick={handleSkip}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Progress */}
            <Progress value={progress} className="h-1 mb-3" />

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {step.description}
            </p>

            {/* Demo interactive content OR tip */}
            {isDemo ? (
              <div className="mb-3">
                {renderDemoContent()}
              </div>
            ) : step.tip ? (
              <div className="flex items-start gap-2 rounded-lg bg-primary/[0.06] border border-primary/10 p-2.5 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-primary/80 leading-relaxed">{step.tip}</p>
              </div>
            ) : null}

            {/* Navigation — hide Next for demo steps that have their own action buttons (except demo_paid) */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Skip tutorial
              </Button>
              <div className="flex items-center gap-2">
                {!isFirst && !isDemo && (
                  <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1 border-border/40 h-8">
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </Button>
                )}
                {/* Only show Next/Finish for info steps and the final demo step (paid) */}
                {(!isDemo || step.id === "demo_paid") && (
                  <Button size="sm" onClick={handleNext} className="gap-1 shadow-glow h-8">
                    {isLast ? "Finish" : "Next"}
                    {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SellerTutorial;

// Helper to trigger tutorial from anywhere
export const startSellerTutorial = () => {
  window.dispatchEvent(new Event("start-seller-tutorial"));
};
