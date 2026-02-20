import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { driver, type DriveStep, type Config } from "driver.js";
import "driver.js/dist/driver.css";

/* ─────────────────── Constants ─────────────────── */

const ACTIVE_KEY = "client_tour_crosspage";
const STEP_KEY = "client_tour_crosspage_step";
const COMPLETED_KEY = "client_tutorial_completed";

/* ─────────────────── Tour phases (cross-page, after request posted) ─────────────────── */

interface TourPhase {
  route: string;        // exact match or prefix
  routePrefix?: boolean; // if true, match by startsWith
  steps: DriveStep[];
}

const TOUR_PHASES: TourPhase[] = [
  // Phase 0 — Active Request page
  {
    route: "/request/",
    routePrefix: true,
    steps: [
      {
        popover: {
          title: "Your Live Request 📡",
          description:
            "This is where the magic happens! Experts see your request and send you <strong>quotes in real-time</strong>. Watch the leaderboard fill up as offers arrive.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Reviewing Quotes",
          description:
            "Each quote shows the expert's <strong>price</strong>, <strong>delivery time</strong>, <strong>rating</strong>, and a personal message. You can chat with any expert before hiring.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Hiring an Expert",
          description:
            'Click <strong>"Hire"</strong> on any quote to accept it. The expert will start working immediately and your payment is held safely in <strong>escrow</strong>.',
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
            "Track all your requests here — see which are <strong>open</strong> (waiting for quotes), <strong>accepted</strong> (expert hired), or <strong>completed</strong>. Click any request to view details.",
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
            "Chat directly with your expert here. Discuss details, share files and screenshots, and track progress — all in one place.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Pro Tip: Stay in Touch",
          description:
            "Respond quickly to your expert's questions. Clear communication leads to better results and faster delivery!",
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
          title: "Your Orders 📦",
          description:
            "All hired orders appear here. Track each order's status from <strong>Active</strong> → <strong>Delivered</strong> → <strong>Completed</strong>.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Delivery & Payment",
          description:
            "When the expert delivers, you have <strong>3 days</strong> to review and confirm. If you don't respond, funds auto-release.<br/><br/>You can raise a <strong>dispute</strong> if something's wrong — your payment is always protected by escrow!",
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
            "See your balance, transaction history, and top up funds here. All payments go through <strong>escrow</strong> so your money is safe until you confirm delivery.",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
  // Phase 5 — Final, back to dashboard
  {
    route: "/dashboard",
    steps: [
      {
        popover: {
          title: "You're All Set! 🚀",
          description:
            "You now know how to use Duxio as a client:<br/><br/>✅ Post requests in any category<br/>✅ Receive & compare quotes from experts<br/>✅ Chat, hire & track orders<br/>✅ Confirm delivery & rate your expert<br/><br/>Go ahead and post your first request — or wait for quotes on the one you just posted!",
          side: "bottom",
          align: "center",
        },
      },
    ],
  },
];

/* ─────────────────── Component ─────────────────── */

const POPOVER_CLASS = "seller-tour-popover";

const ClientTutorial = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
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

  const matchesRoute = useCallback((phase: TourPhase) => {
    if (phase.routePrefix) return location.pathname.startsWith(phase.route);
    return location.pathname === phase.route;
  }, [location.pathname]);

  const completeAll = useCallback(() => {
    if (userId) localStorage.setItem(`${COMPLETED_KEY}_${userId}`, "true");
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
            driverRef.current = null;
            const next = phaseIndex + 1;
            if (next < TOUR_PHASES.length) {
              startPhase(next);
            } else {
              completeAll();
            }
          } else {
            d.destroy();
            driverRef.current = null;
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
      localStorage.setItem(ACTIVE_KEY, "true");
      localStorage.setItem(STEP_KEY, String(phaseIndex));

      const targetRoute = phase.routePrefix
        ? (location.pathname.startsWith(phase.route) ? location.pathname : phase.route)
        : phase.route;

      if (location.pathname !== targetRoute && !matchesRoute(phase)) {
        navigate(targetRoute);
        setTimeout(() => initDriver(phaseIndex), 600);
      } else {
        setTimeout(() => initDriver(phaseIndex), 300);
      }
    },
    [location.pathname, navigate, completeAll, initDriver, matchesRoute]
  );

  // Resume across navigation
  useEffect(() => {
    const active = localStorage.getItem(ACTIVE_KEY);
    const step = localStorage.getItem(STEP_KEY);
    if (active === "true" && step) {
      const phaseIndex = parseInt(step, 10);
      const phase = TOUR_PHASES[phaseIndex];
      if (phase && matchesRoute(phase) && !driverRef.current) {
        setTimeout(() => initDriver(phaseIndex), 500);
      }
    }
  }, [location.pathname, initDriver, matchesRoute]);

  // Cleanup
  useEffect(() => {
    return () => { driverRef.current?.destroy(); };
  }, []);

  return null;
};

export default ClientTutorial;

// Helper to start the cross-page tour from outside
export const startClientTutorial = () => {
  localStorage.setItem("client_tour_crosspage", "true");
  localStorage.setItem("client_tour_crosspage_step", "0");
  window.dispatchEvent(new Event("client-tour-navigate"));
};
