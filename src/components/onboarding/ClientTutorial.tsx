import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

/* ─────────────────── Constants ─────────────────── */

const STORAGE_KEY = "client_tutorial_completed";
const ACTIVE_KEY = "client_tutorial_active";
const STEP_KEY = "client_tutorial_step";

/* ─────────────────── Tour phases ─────────────────── */

interface TourPhase {
  route: string;
  steps: DriveStep[];
}

const TOUR_PHASES: TourPhase[] = [
  // Phase 0 — Post Request page
  {
    route: "/post-request",
    steps: [
      {
        popover: {
          title: "Welcome to Duxio! 🎉",
          description:
            "Let's walk you through how to get expert help. We'll tour the real interface — click <strong>Next</strong> to follow along!",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Step 1: Pick a Category",
          description:
            "Choose what you need help with — Gaming, Tech, Business, Creative, and more. You can also use <strong>Custom Request</strong> to let AI pick the best category for you.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Step 2: Describe Your Request",
          description:
            "After picking a category and subcategory, you'll fill in a <strong>title</strong>, <strong>delivery time</strong>, and <strong>description</strong>. Be specific — better descriptions attract better quotes!",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Step 3: Submit & Wait",
          description:
            "Once you submit, experts in that category are <strong>notified instantly</strong>. You'll start receiving quotes in under 90 seconds on average!",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
  // Phase 1 — Dashboard
  {
    route: "/dashboard",
    steps: [
      {
        popover: {
          title: "Your Dashboard 📊",
          description:
            "This is your command center. See your wallet balance, active requests, completed orders, and totals at a glance.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Your Requests",
          description:
            "All your posted requests appear here with their status: <strong>Open</strong> (waiting for quotes), <strong>Accepted</strong> (expert hired), or <strong>Completed</strong> (job done). Click any request to view details.",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
  // Phase 2 — Inbox
  {
    route: "/inbox",
    steps: [
      {
        popover: {
          title: "Your Inbox 💬",
          description:
            "Once an expert sends you a quote, a chat session opens here. Discuss details, ask questions, and negotiate before accepting an offer.",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
  // Phase 3 — Purchased Orders
  {
    route: "/orders/purchased",
    steps: [
      {
        popover: {
          title: "Your Purchased Orders 📦",
          description:
            "After you hire an expert, the order appears here. Track progress, communicate with the expert, and confirm delivery when the job is done.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Order Lifecycle",
          description:
            "1️⃣ <strong>Active</strong> — expert is working<br/>2️⃣ <strong>Delivered</strong> — expert marked it done<br/>3️⃣ <strong>Completed</strong> — you confirmed or auto-released after 3 days<br/><br/>You can raise a dispute within 3 days if something's wrong.",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
  // Phase 4 — Wallet
  {
    route: "/wallet",
    steps: [
      {
        popover: {
          title: "Your Wallet 💰",
          description:
            "Manage your funds here. Payments are held in <strong>escrow</strong> until you confirm delivery — your money is always protected.",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
  // Phase 5 — Back to post-request, final
  {
    route: "/post-request",
    steps: [
      {
        popover: {
          title: "You're Ready! 🚀",
          description:
            "You now know how Duxio works:<br/><br/>✅ Post a request in any category<br/>✅ Receive quotes from verified experts<br/>✅ Chat, negotiate & hire<br/>✅ Pay safely with escrow protection<br/><br/>Go ahead and post your first request!",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
];

/* ─────────────────── Component ─────────────────── */

const POPOVER_CLASS = "seller-tour-popover"; // reuse same styling

const ClientTutorial = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const phaseRef = useRef(0);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || "");
    });
    return () => subscription.unsubscribe();
  }, []);

  const completeAll = useCallback(() => {
    if (userId) localStorage.setItem(`${STORAGE_KEY}_${userId}`, "true");
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(STEP_KEY);
    driverRef.current?.destroy();
    driverRef.current = null;
  }, [userId]);

  const initDriver = useCallback(
    (phaseIndex: number) => {
      if (driverRef.current) driverRef.current.destroy();

      const phase = TOUR_PHASES[phaseIndex];
      const isLastPhase = phaseIndex === TOUR_PHASES.length - 1;

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
        doneBtnText: isLastPhase ? "Let's Go! 🎉" : "Continue →",
        progressText: `Step {{current}} of {{total}}`,
        steps: phase.steps,
        onDestroyStarted: () => {
          if (!d.hasNextStep() || d.isLastStep()) {
            d.destroy();
            const next = phaseIndex + 1;
            if (next < TOUR_PHASES.length) {
              startPhase(next);
            } else {
              completeAll();
            }
          } else {
            d.destroy();
            completeAll();
          }
        },
      } as Config);

      driverRef.current = d;
      d.drive();
    },
    [completeAll]
  );

  const startPhase = useCallback(
    (phaseIndex: number) => {
      if (phaseIndex >= TOUR_PHASES.length) {
        completeAll();
        return;
      }

      const phase = TOUR_PHASES[phaseIndex];
      phaseRef.current = phaseIndex;
      localStorage.setItem(ACTIVE_KEY, "true");
      localStorage.setItem(STEP_KEY, String(phaseIndex));

      if (location.pathname !== phase.route) {
        navigate(phase.route);
        setTimeout(() => initDriver(phaseIndex), 600);
      } else {
        setTimeout(() => initDriver(phaseIndex), 300);
      }
    },
    [location.pathname, navigate, completeAll, initDriver]
  );

  // Resume across navigation
  useEffect(() => {
    const active = localStorage.getItem(ACTIVE_KEY);
    const step = localStorage.getItem(STEP_KEY);
    if (active === "true" && step) {
      const phaseIndex = parseInt(step, 10);
      const phase = TOUR_PHASES[phaseIndex];
      if (phase && location.pathname === phase.route && !driverRef.current) {
        setTimeout(() => initDriver(phaseIndex), 400);
      }
    }
  }, [location.pathname, initDriver]);

  // Listen for start event
  useEffect(() => {
    const handler = () => {
      if (userId) localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
      startPhase(0);
    };
    window.addEventListener("start-client-tutorial", handler);
    return () => window.removeEventListener("start-client-tutorial", handler);
  }, [startPhase, userId]);

  // Cleanup
  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return null;
};

export default ClientTutorial;

export const startClientTutorial = () => {
  window.dispatchEvent(new Event("start-client-tutorial"));
};
