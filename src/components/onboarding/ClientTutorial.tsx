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
  route: string;
  routePrefix?: boolean;
  steps: DriveStep[];
}

const TOUR_PHASES: TourPhase[] = [
  // Phase 0 — Active Request page (final destination)
  {
    route: "/request/",
    routePrefix: true,
    steps: [
      {
        popover: {
          title: "Your Live Request 📡",
          description:
            "This is where the magic happens! Experts see your request and send you <strong>quotes in real-time</strong>. Watch as offers start rolling in.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Reviewing Quotes 💰",
          description:
            "Each quote shows the expert's <strong>price</strong>, <strong>delivery time</strong>, <strong>rating</strong>, and a personal message. Compare them to find the best fit.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Chat with Experts 💬",
          description:
            "You can <strong>chat directly</strong> with any expert who sends a quote. Ask questions, negotiate details, or request samples before deciding.",
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "Accept & Pay Securely 🔒",
          description:
            'Click <strong>"Accept & Pay"</strong> on the quote you like best. Your payment is held safely in <strong>escrow</strong> — it only releases when you confirm the work is delivered.',
          side: "bottom",
          align: "center",
        },
      },
      {
        popover: {
          title: "You're All Set! 🚀",
          description:
            "That's the basics!<br/><br/>✅ Post requests in any category<br/>✅ Receive & compare live quotes<br/>✅ Chat with experts before hiring<br/>✅ Pay securely with escrow protection<br/><br/>Now sit back and wait for expert offers!",
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
        doneBtnText: "Got it! 🎉",
        progressText: `Step {{current}} of {{total}}`,
        steps: phase.steps,
        onDestroyStarted: () => {
          d.destroy();
          driverRef.current = null;
          completeAll();
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
