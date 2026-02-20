import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  X, ChevronRight, ChevronLeft, LayoutDashboard, Send, MessageSquare,
  Package, Wallet, Settings, Sparkles, GraduationCap, PartyPopper,
  Target, Clock, Shield,
} from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  tip: string;
  icon: any;
  route: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Selling on Duxio! 🎉",
    description: "This quick tour will walk you through everything you need to know to start earning. It only takes a minute!",
    tip: "You can replay this tutorial anytime from your Expert Dashboard.",
    icon: GraduationCap,
    route: "/dashboard",
  },
  {
    id: "dashboard",
    title: "Your Expert Dashboard",
    description: "Switch between Client and Expert views using the toggle at the top. The Expert view shows open requests from buyers that match your subscribed categories.",
    tip: "Subscribe to categories in Settings so relevant jobs appear here automatically.",
    icon: LayoutDashboard,
    route: "/dashboard",
  },
  {
    id: "quoting",
    title: "Browse & Send Quotes",
    description: "Open requests appear in your feed. Click 'Quote' to submit your price, delivery time, and an optional message. Competitive pricing and fast responses win more jobs!",
    tip: "Your first quote message also starts a chat session with the buyer.",
    icon: Send,
    route: "/dashboard",
  },
  {
    id: "inbox",
    title: "Inbox & Messaging",
    description: "After sending a quote, you can chat with the buyer here. Discuss requirements, share files, and clarify details before they accept your offer.",
    tip: "Fast replies improve your response time stat and build buyer trust.",
    icon: MessageSquare,
    route: "/inbox",
  },
  {
    id: "orders",
    title: "Manage Your Orders",
    description: "Once a buyer accepts your quote, the job moves here. Track ongoing orders, deliver work, and view your completed order history.",
    tip: "Always provide proof of completion (screenshots, files) to protect yourself in disputes.",
    icon: Package,
    route: "/orders/sold",
  },
  {
    id: "wallet",
    title: "Earnings & Withdrawals",
    description: "Your earnings appear here after buyers approve your delivery. Funds auto-release after 48 hours if there's no dispute. Withdraw via PayPal or crypto.",
    tip: "The platform takes a 5% fee on completed jobs. The rest is yours!",
    icon: Wallet,
    route: "/wallet",
  },
  {
    id: "settings",
    title: "Settings & Availability",
    description: "Set your hourly rate, availability schedule, timezone, skills, and bio. A complete profile with a photo attracts more buyers.",
    tip: "Toggle your availability to control when you appear as 'Online' to buyers.",
    icon: Settings,
    route: "/settings",
  },
  {
    id: "done",
    title: "You're All Set! 🚀",
    description: "You now know the basics of selling on Duxio. Subscribe to categories, keep your profile updated, and start sending quotes to earn!",
    tip: "Top sellers respond within 2 minutes and maintain a 4.5+ rating.",
    icon: PartyPopper,
    route: "/dashboard",
  },
];

const STORAGE_KEY = "seller_tutorial_completed";
const ACTIVE_KEY = "seller_tutorial_active";
const STEP_KEY = "seller_tutorial_step";

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

  // Get userId from auth if not provided
  useEffect(() => {
    if (!propUserId) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) setUserId(session.user.id);
      });
    }
  }, [propUserId]);

  // Auto-start on first seller login or manual trigger
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

  // Resume tutorial if it was active across navigation
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
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, "true");
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(STEP_KEY);
    // Navigate back to dashboard on finish
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Public method to start tutorial (used via ref or manual trigger)
  useEffect(() => {
    const handler = () => {
      setIsActive(true);
      setCurrentStep(0);
      localStorage.setItem(ACTIVE_KEY, "true");
      localStorage.setItem(STEP_KEY, "0");
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard");
      }
    };
    window.addEventListener("start-seller-tutorial", handler);
    return () => window.removeEventListener("start-seller-tutorial", handler);
  }, [location.pathname, navigate]);

  if (!isActive || !step) return null;

  const StepIcon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[90] animate-fade-in" />

      {/* Tutorial card */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-24px)] max-w-lg animate-slide-up">
        <Card className="border-primary/20 shadow-glow bg-card/95 backdrop-blur-xl">
          <CardContent className="p-4 sm:p-5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <StepIcon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm leading-tight">{step.title}</h3>
                  <Badge variant="outline" className="text-[10px] mt-0.5 border-primary/20 text-primary">
                    Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-destructive/10" onClick={handleSkip}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Progress */}
            <Progress value={progress} className="h-1 mb-3" />

            {/* Content */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {step.description}
            </p>

            {/* Tip */}
            <div className="flex items-start gap-2 rounded-lg bg-primary/[0.06] border border-primary/10 p-2.5 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary/80 leading-relaxed">{step.tip}</p>
            </div>

            {/* Navigation */}
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
                {!isFirst && (
                  <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1 border-border/40 h-8">
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="gap-1 shadow-glow h-8">
                  {isLast ? "Finish" : "Next"}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                </Button>
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
