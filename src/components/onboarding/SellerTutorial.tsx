import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

/* ─────────────────── Constants ─────────────────── */

const STORAGE_KEY = "seller_tutorial_completed";
const ACTIVE_KEY = "seller_tutorial_active";
const STEP_KEY = "seller_tutorial_step";

/* ─────────────────── Tour phases ─────────────────── 
   Each phase runs on a specific route.
   When a phase ends, a bridge step tells the user to click the nav link themselves.
*/

interface TourPhase {
  route: string;
  steps: DriveStep[];
  /** Element selector for the nav link the user should click to proceed */
  bridgeElement?: string;
  /** Text for the bridge step telling the user where to navigate */
  bridgeTitle?: string;
  bridgeDescription?: string;
}

const TOUR_PHASES: TourPhase[] = [
  // Phase 0 — Dashboard overview
  {
    route: "/dashboard",
    steps: [
      {
        popover: {
          title: "Welcome to Selling on Duxio! 🎉",
          description: "Let's take a quick tour of everything you need to know as a seller. We'll walk through the real interface — no simulations!",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-view-toggle",
        popover: {
          title: "Client / Expert Toggle",
          description: "Switch between your Client and Expert views here. As a seller, you'll mostly use the Expert view to find jobs and manage orders.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-stats",
        popover: {
          title: "Your Stats at a Glance",
          description: "Track your earnings, completed orders, rating, and subscribed categories. These update in real-time as you complete jobs.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-tabs",
        popover: {
          title: "Your Job Feed",
          description: "The <strong>Live</strong> tab shows open requests matching your categories. <strong>Ongoing</strong> shows accepted orders. Click 'Quote' on any job to submit your offer!",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-categories",
        popover: {
          title: "Your Subscribed Categories",
          description: "You'll only see jobs in categories you've subscribed to. Click 'Edit' to manage them in Settings.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#tour-quick-actions",
        popover: {
          title: "Quick Actions",
          description: "Jump to category management, earnings overview, or your sold orders from here.",
          side: "left",
          align: "start",
        },
      },
    ],
    bridgeElement: "#tour-inbox-link",
    bridgeTitle: "Next: Your Inbox 💬",
    bridgeDescription: "Click the <strong>Inbox icon</strong> in the navigation bar to continue the tour!",
  },
  // Phase 1 — Inbox
  {
    route: "/inbox",
    steps: [
      {
        popover: {
          title: "Your Inbox 💬",
          description: "After you send a quote, a chat session opens with the buyer here. Discuss details, share files, and negotiate before they accept your offer.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Pro Tip: Fast Replies Win",
          description: "Buyers see your average response time on your profile. Responding within <strong>2 minutes</strong> dramatically increases your chances of being selected!",
          side: "bottom",
          align: "center",
        },
      },
    ],
    bridgeTitle: "Next: Sold Orders 📦",
    bridgeDescription: "Now navigate to <strong>Sold Orders</strong> — you can find it in the menu (your profile dropdown) or Quick Actions on the dashboard.",
  },
  // Phase 2 — Sold Orders
  {
    route: "/orders/sold",
    steps: [
      {
        popover: {
          title: "Your Sold Orders 📦",
          description: "Track all your accepted, completed, and disputed orders here. Once a buyer accepts your quote, the order appears here.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Order Lifecycle",
          description: "1️⃣ <strong>Ongoing</strong> — work in progress<br/>2️⃣ <strong>Delivered</strong> — you marked it done<br/>3️⃣ <strong>Completed</strong> — buyer approved or auto-released after 3 days<br/><br/>Always provide proof of completion (screenshots, files) to protect yourself in disputes!",
          side: "bottom",
          align: "center",
        },
      },
    ],
    bridgeElement: "#tour-wallet-link",
    bridgeTitle: "Next: Your Wallet 💰",
    bridgeDescription: "Click the <strong>Balance / Wallet button</strong> in the navigation bar to continue!",
  },
  // Phase 3 — Wallet
  {
    route: "/wallet",
    steps: [
      {
        popover: {
          title: "Your Wallet & Earnings 💰",
          description: "All your earnings appear here after buyers confirm delivery. Funds auto-release after 3 days if there's no dispute.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Withdrawals",
          description: "Withdraw your earnings via <strong>PayPal</strong> or <strong>Crypto</strong> (USDT/USDC). The platform takes a <strong>5% fee</strong> on completed jobs — the rest is yours!",
          side: "bottom",
          align: "center",
        },
      },
    ],
    bridgeTitle: "Next: Settings ⚙️",
    bridgeDescription: "Now navigate to <strong>Settings</strong> — you can find it in your profile dropdown menu in the top-right corner.",
  },
  // Phase 4 — Settings
  {
    route: "/settings",
    steps: [
      {
        popover: {
          title: "Your Settings ⚙️",
          description: "Complete your profile here — display name, bio, avatar, hourly rate, timezone, and skills. A complete profile attracts more buyers!",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Categories & Availability",
          description: "Use the <strong>Categories</strong> tab to subscribe to the job types you want to receive. Toggle your availability to appear as 'Online' to buyers.",
          side: "bottom",
          align: "center",
        },
      },
    ],
    bridgeTitle: "Final Step: Back to Dashboard 🏠",
    bridgeDescription: "Click <strong>Dashboard</strong> in the navigation or your profile menu to finish the tour!",
  },
  // Phase 5 — Back to dashboard, final
  {
    route: "/dashboard",
    steps: [
      {
        popover: {
          title: "You're All Set! 🚀",
          description: "You now know the basics of selling on Duxio.<br/><br/>✅ Subscribe to categories<br/>✅ Send competitive quotes<br/>✅ Respond fast & deliver quality work<br/>✅ Earn money and build your reputation<br/><br/>You can replay this tutorial anytime from your Expert Dashboard. Good luck!",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
];

/* ─────────────────── Shared popover class overrides ─────────────────── */

const POPOVER_CLASS = "seller-tour-popover";

/* ─────────────────── Component ─────────────────── */

interface SellerTutorialProps {
  userId?: string;
  autoStart?: boolean;
  onComplete?: () => void;
}

const SellerTutorial = ({ userId: propUserId, autoStart = false, onComplete }: SellerTutorialProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const phaseRef = useRef(0);
  const [userId, setUserId] = useState(propUserId || "");

  // Get userId
  useEffect(() => {
    if (!propUserId) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) setUserId(session.user.id);
      });
    }
  }, [propUserId]);

  const completeAll = useCallback(() => {
    if (userId) localStorage.setItem(`${STORAGE_KEY}_${userId}`, "true");
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(STEP_KEY);
    driverRef.current?.destroy();
    driverRef.current = null;
    onComplete?.();
  }, [userId, onComplete]);

  const initDriver = useCallback((phaseIndex: number) => {
    // Clean up previous
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const phase = TOUR_PHASES[phaseIndex];
    const isLastPhase = phaseIndex === TOUR_PHASES.length - 1;
    const hasBridge = !isLastPhase && (phase.bridgeTitle || phase.bridgeDescription);

    // Build steps: phase steps + optional bridge step
    const allSteps = [...phase.steps];

    if (hasBridge) {
      const bridgeStep: DriveStep = {
        ...(phase.bridgeElement ? { element: phase.bridgeElement } : {}),
        popover: {
          title: phase.bridgeTitle || "Continue the tour",
          description: phase.bridgeDescription || "Navigate to the next page to continue.",
          side: "bottom" as const,
          align: "center" as const,
        },
      };
      allSteps.push(bridgeStep);
    }

    const d = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "hsl(0 0% 0% / 0.6)",
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: POPOVER_CLASS,
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: isLastPhase ? "Finish 🎉" : "Got it! 👍",
      progressText: `Step {{current}} of {{total}}`,
      steps: allSteps,
      onDestroyStarted: () => {
        d.destroy();
        driverRef.current = null;

        // Move to next phase — but DON'T navigate, wait for user to click
        const next = phaseIndex + 1;
        if (next < TOUR_PHASES.length) {
          localStorage.setItem(ACTIVE_KEY, "true");
          localStorage.setItem(STEP_KEY, String(next));
          // Don't navigate — user clicks the link themselves
        } else {
          completeAll();
        }
      },
    } as Config);

    driverRef.current = d;
    d.drive();
  }, [completeAll]);

  const startPhase = useCallback((phaseIndex: number) => {
    if (phaseIndex >= TOUR_PHASES.length) {
      completeAll();
      return;
    }

    const phase = TOUR_PHASES[phaseIndex];
    phaseRef.current = phaseIndex;
    localStorage.setItem(ACTIVE_KEY, "true");
    localStorage.setItem(STEP_KEY, String(phaseIndex));

    // For the first phase (phase 0), navigate if not already there
    if (phaseIndex === 0 && location.pathname !== phase.route) {
      navigate(phase.route);
      setTimeout(() => initDriver(phaseIndex), 600);
    } else if (location.pathname === phase.route) {
      setTimeout(() => initDriver(phaseIndex), 300);
    }
    // Otherwise don't navigate — the resume logic will handle it when user arrives
  }, [location.pathname, navigate, completeAll, initDriver]);

  // Resume across navigation
  useEffect(() => {
    const active = localStorage.getItem(ACTIVE_KEY);
    const step = localStorage.getItem(STEP_KEY);
    if (active === "true" && step) {
      const phaseIndex = parseInt(step, 10);
      const phase = TOUR_PHASES[phaseIndex];
      // Only resume if we're on the right route
      if (phase && location.pathname === phase.route && !driverRef.current) {
        setTimeout(() => initDriver(phaseIndex), 400);
      }
    }
  }, [location.pathname, initDriver]);

  // Auto-start on first seller login
  useEffect(() => {
    if (autoStart && userId) {
      const completed = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (!completed) {
        startPhase(0);
      }
    }
  }, [autoStart, userId]);

  // Start tutorial via event
  useEffect(() => {
    const handler = () => {
      if (userId) localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
      startPhase(0);
    };
    window.addEventListener("start-seller-tutorial", handler);
    return () => window.removeEventListener("start-seller-tutorial", handler);
  }, [startPhase, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return null;
};

export default SellerTutorial;

// Helper to trigger tutorial from anywhere
export const startSellerTutorial = () => {
  window.dispatchEvent(new Event("start-seller-tutorial"));
};
