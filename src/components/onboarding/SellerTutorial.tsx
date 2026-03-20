import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

/* ─────────────────── Constants ─────────────────── */

const STORAGE_KEY = "seller_tutorial_completed";
const ACTIVE_KEY = "seller_tutorial_active";
const STEP_KEY = "seller_tutorial_step";
const SUBSTEP_KEY = "seller_tutorial_substep";

/* ─────────────────── Tour phases ─────────────────── 
   Each phase runs on a specific route.
   When a phase ends, a bridge step tells the user to click the nav link themselves.
*/

interface TourPhase {
  route: string;
  /** Additional route prefixes that also match this phase */
  altRoutes?: string[];
  steps: DriveStep[];
  /** Element selector for the nav link the user should click to proceed */
  bridgeElement?: string;
  /** Text for the bridge step telling the user where to navigate */
  bridgeTitle?: string;
  bridgeDescription?: string;
  /** If true, programmatically open the profile dropdown before showing the bridge step */
  openProfileMenu?: boolean;
}

/** Check if current path matches the phase route or any alt routes */
const matchesPhaseRoute = (pathname: string, phase: TourPhase): boolean => {
  if (pathname === phase.route) return true;
  return (phase.altRoutes || []).some(alt => pathname.startsWith(alt));
};

const TOUR_PHASES: TourPhase[] = [
  // Phase 0 — Dashboard overview + Demo job
  {
    route: "/dashboard",
    steps: [
      {
        popover: {
          title: "Welcome to Selling on Druxio! 🎉",
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
        element: "#tour-demo-job-quote",
        popover: {
          title: "🎓 Click Quote to Try It!",
          description: "Click the <strong>Quote</strong> button on this demo request. Set your price, delivery time, and message — then send it! The tour will resume automatically after.",
          side: "left",
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
    bridgeElement: "#tour-quotes-link",
    bridgeTitle: "Next: Active Quotes 📋",
    bridgeDescription: "Now send a <strong>Quote</strong> on the demo job above, then click <strong>Active Quotes</strong> in the navigation bar to see it!",
  },
  // Phase 1 — Active Quotes (Quotes Terminal) with demo highlights
  {
    route: "/quotes",
    altRoutes: ["/request/"],
    steps: [
      {
        popover: {
          title: "Your Quotes Terminal 📋",
          description: "Now we’ll go step by step through the Active Quotes page, exactly like the Dashboard tutorial.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-quotes-header",
        popover: {
          title: "Quotes Hub",
          description: "This header shows how many pending quotes you currently have and is your entry point back to the Dashboard.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-quotes-sidebar",
        popover: {
          title: "Sidebar: All Your Quotes",
          description: "Each card is a buyer conversation. Cards show your offered price, delivery time, and urgency countdown.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-quotes-demo-item",
        popover: {
          title: "Tutorial Quote (Auto Opened)",
          description: "During tutorial mode, this demo quote is auto-opened so you can learn the full flow without searching.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "#tour-quotes-chat-panel",
        popover: {
          title: "Center: Conversation",
          description: "This is where buyer and seller messages appear. Read context here before changing your offer.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#tour-quotes-demo-send",
        popover: {
          title: "Step 1: Send Scripted Reply",
          description: "Click Send to post the next guided seller message in the tutorial conversation.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-quotes-right-panel",
        popover: {
          title: "Right Panel: Decision Data",
          description: "See request details, buyer profile, your current offer, and expiry timer in one place.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#tour-quotes-update-offer-button",
        popover: {
          title: "Step 2: Update Offer",
          description: "After editing price/time, click here to send an updated offer to the buyer.",
          side: "left",
          align: "center",
        },
      },
      {
        popover: {
          title: "Pro Tip: Fast Replies Win ⚡",
          description: "Responding quickly and updating offers clearly increases your chances of being accepted.",
          side: "bottom",
          align: "center",
        },
      },
    ],
    bridgeElement: "#tour-inbox-link",
    bridgeTitle: "Next: Your Inbox 💬",
    bridgeDescription: "Click the <strong>Inbox icon</strong> in the navigation bar to continue the tour!",
  },
  // Phase 2 — Inbox
  {
    route: "/inbox",
    steps: [
      {
        popover: {
          title: "Your Inbox 💬",
          description: "This is where you see all your <strong>active orders</strong> and <strong>completed/cancelled</strong> conversations. Quote chats are managed separately in the Quotes Terminal.",
          side: "bottom",
          align: "center",
        },
      },
    ],
    bridgeElement: "#tour-sold-orders-link",
    bridgeTitle: "Next: Sold Orders 📦",
    bridgeDescription: "Click <strong>Sold Orders</strong> in the menu to continue the tour!",
    openProfileMenu: true,
  },
  // Phase 3 — Sold Orders
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
  // Phase 4 — Wallet
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
    bridgeElement: "#tour-settings-link",
    bridgeTitle: "Next: Settings ⚙️",
    bridgeDescription: "Click <strong>Settings</strong> in the menu to continue the tour!",
    openProfileMenu: true,
  },
  // Phase 5 — Settings
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
    bridgeElement: "#tour-dashboard-link",
    bridgeTitle: "Final Step: Back to Dashboard 🏠",
    bridgeDescription: "Click <strong>Dashboard</strong> in the navigation bar to finish the tour!",
  },
  // Phase 6 — Back to dashboard, final
  {
    route: "/dashboard",
    steps: [
      {
        popover: {
          title: "You're All Set! 🚀",
          description: "You now know the basics of selling on Druxio.<br/><br/>✅ Subscribe to categories<br/>✅ Send competitive quotes<br/>✅ Chat with buyers & update offers<br/>✅ Use the <strong>Quotes Terminal</strong> to manage everything<br/>✅ Respond fast & deliver quality work<br/>✅ Earn money and build your reputation<br/><br/>You can replay this tutorial anytime from your Expert Dashboard. Good luck!",
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
  const isPausingForDemoRef = useRef(false);
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
    localStorage.removeItem(SUBSTEP_KEY);
    driverRef.current?.destroy();
    driverRef.current = null;
    onComplete?.();
  }, [userId, onComplete]);

  const initDriver = useCallback((phaseIndex: number, startStep?: number) => {
    // Clean up previous
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const phase = TOUR_PHASES[phaseIndex];
    phaseRef.current = phaseIndex;
    const isLastPhase = phaseIndex === TOUR_PHASES.length - 1;
    const hasBridge = !isLastPhase && (phase.bridgeTitle || phase.bridgeDescription);

    // Build steps: phase steps + optional bridge step
    const allSteps = [...phase.steps];

    if (hasBridge) {
      const needsProfileMenu = phase.openProfileMenu;
      const bridgeStep: DriveStep = {
        ...(phase.bridgeElement ? { element: phase.bridgeElement } : {}),
        ...(needsProfileMenu ? { disableActiveInteraction: false } : {}),
        popover: {
          title: phase.bridgeTitle || "Continue the tour",
          description: phase.bridgeDescription || "Navigate to the next page to continue.",
          side: "bottom" as const,
          align: "center" as const,
          onPopoverRender: needsProfileMenu ? () => {
            // Open the profile dropdown so the menu item is visible
            const profileBtn = document.querySelector("#tour-profile-menu") as HTMLElement;
            if (profileBtn) {
              // Small delay to let driver.js finish rendering
              setTimeout(() => profileBtn.click(), 100);
            }
          } : undefined,
        },
      };
      allSteps.push(bridgeStep);
    }

    // For phase 0, modify the demo quote step to allow direct interaction
    if (phaseIndex === 0) {
      const demoIdx = allSteps.findIndex(s => s.element === "#tour-demo-job-quote");
      if (demoIdx >= 0 && (!startStep || startStep <= demoIdx)) {
        const pauseAtDemoQuote = () => {
          if (!driverRef.current) return;
          localStorage.setItem(SUBSTEP_KEY, String(demoIdx + 1));
          localStorage.setItem(STEP_KEY, "0");
          isPausingForDemoRef.current = true;
          driverRef.current.destroy();
          driverRef.current = null;
        };

        const origPopover = allSteps[demoIdx].popover!;
        allSteps[demoIdx] = {
          element: "#tour-demo-job-quote",
          disableActiveInteraction: false,
          popover: {
            ...origPopover,
            onPopoverRender: (popover: any) => {
              // Remove Next button: this step advances by clicking the Quote button
              if (popover.nextButton) {
                popover.nextButton.style.display = "none";
              }

              const quoteBtn = document.querySelector("#tour-demo-job-quote");
              if (quoteBtn) {
                (quoteBtn as HTMLElement).style.pointerEvents = "auto";
                quoteBtn.addEventListener("click", pauseAtDemoQuote, { once: true });
              }
            },
          },
        };
      }
    }

    const d = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      disableActiveInteraction: true,
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
        const isFinished = d.isLastStep();
        d.destroy();
        driverRef.current = null;

        // Pause without advancing phases when the user clicks the demo Quote button
        if (isPausingForDemoRef.current) {
          isPausingForDemoRef.current = false;
          return;
        }

        // If user clicked X (closed early without finishing), fully exit tutorial
        if (!isFinished) {
          completeAll();
          return;
        }

        // Move to next phase — but DON'T navigate, wait for user to click
        const next = phaseIndex + 1;
        if (next < TOUR_PHASES.length) {
          localStorage.setItem(ACTIVE_KEY, "true");
          localStorage.setItem(STEP_KEY, String(next));
        } else {
          completeAll();
        }
      },
    } as Config);

    driverRef.current = d;
    d.drive(startStep || 0);
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
    } else if (matchesPhaseRoute(location.pathname, phase)) {
      setTimeout(() => initDriver(phaseIndex), 300);
    }
    // Otherwise don't navigate — the resume logic will handle it when user arrives
  }, [location.pathname, navigate, completeAll, initDriver]);

  // Resume across navigation (also recover if user lands on a later phase route)
  useEffect(() => {
    const active = localStorage.getItem(ACTIVE_KEY);
    const step = localStorage.getItem(STEP_KEY);
    if (active !== "true") return;

    const parsedStep = parseInt(step || "0", 10);
    const storedPhaseIndex = Number.isNaN(parsedStep) ? 0 : parsedStep;

    // If the stored phase matches the current route, always prefer it.
    // This prevents Phase 0 (/dashboard) from overriding Phase 6 (/dashboard).
    const storedPhase = TOUR_PHASES[storedPhaseIndex];
    if (storedPhase && matchesPhaseRoute(location.pathname, storedPhase) && !driverRef.current) {
      setTimeout(() => initDriver(storedPhaseIndex), 400);
      return;
    }

    // Otherwise, detect the phase from the route (user navigated manually).
    // Only advance forward, never go backwards.
    const routePhaseIndex = TOUR_PHASES.findIndex((phase) => matchesPhaseRoute(location.pathname, phase));
    if (routePhaseIndex >= 0 && routePhaseIndex !== storedPhaseIndex) {
      const effectivePhaseIndex = Math.max(routePhaseIndex, storedPhaseIndex);
      localStorage.setItem(STEP_KEY, String(effectivePhaseIndex));

      const effectivePhase = TOUR_PHASES[effectivePhaseIndex];
      if (effectivePhase && matchesPhaseRoute(location.pathname, effectivePhase) && !driverRef.current) {
        setTimeout(() => initDriver(effectivePhaseIndex), 400);
      }
    }
  }, [location.pathname, initDriver]);

  // Resume after demo quote is sent
  useEffect(() => {
    const handler = () => {
      const substep = localStorage.getItem(SUBSTEP_KEY);
      if (substep) {
        localStorage.removeItem(SUBSTEP_KEY);
        const stepIdx = parseInt(substep, 10);
        localStorage.setItem(STEP_KEY, "0");
        // Resume phase 0 from the step after the demo
        setTimeout(() => initDriver(0, stepIdx), 600);
      }
    };
    window.addEventListener("seller-tutorial-quote-sent", handler);
    return () => window.removeEventListener("seller-tutorial-quote-sent", handler);
  }, [initDriver]);

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
