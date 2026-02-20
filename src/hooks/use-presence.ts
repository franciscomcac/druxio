import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const APPEAR_OFFLINE_KEY = "appear_offline_override";

/**
 * Automatically marks an expert as online while they have the site open
 * and offline when they close/navigate away.
 * Supports a manual "appear offline" override.
 * Only activates for users who have the "mentor" role.
 */
export function usePresence() {
  const userIdRef = useRef<string | null>(null);
  const isMentorRef = useRef(false);
  const [appearOffline, setAppearOfflineState] = useState(false);
  const [isMentor, setIsMentor] = useState(false);

  const setOnline = async (userId: string) => {
    await supabase.from("profiles").update({ is_online: true }).eq("id", userId);
  };

  const setOffline = async (userId: string) => {
    await supabase.from("profiles").update({ is_online: false }).eq("id", userId);
  };

  const setAppearOffline = useCallback(async (offline: boolean) => {
    setAppearOfflineState(offline);
    localStorage.setItem(APPEAR_OFFLINE_KEY, offline ? "true" : "false");

    if (!userIdRef.current || !isMentorRef.current) return;

    if (offline) {
      await setOffline(userIdRef.current);
    } else {
      await setOnline(userIdRef.current);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Load override from localStorage
    const saved = localStorage.getItem(APPEAR_OFFLINE_KEY);
    const isOverrideOffline = saved === "true";
    setAppearOfflineState(isOverrideOffline);

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) return;

      const userId = session.user.id;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const mentor = roles?.some((r) => r.role === "mentor") ?? false;

      if (!mounted) return;

      if (mentor) {
        setIsMentor(true);
        isMentorRef.current = true;
        userIdRef.current = userId;

        // Only set online if not manually overridden to offline
        if (!isOverrideOffline) {
          await setOnline(userId);
        } else {
          await setOffline(userId);
        }
      }
    };

    init();

    const handleBeforeUnload = () => {
      if (userIdRef.current && isMentorRef.current) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userIdRef.current}`;
        const body = JSON.stringify({ is_online: false });
        navigator.sendBeacon(
          url,
          new Blob([body], { type: "application/json" })
        );
      }
    };

    const handleVisibilityChange = () => {
      if (!userIdRef.current || !isMentorRef.current) return;
      // Check current override state from localStorage (most up to date)
      const currentOverride = localStorage.getItem(APPEAR_OFFLINE_KEY) === "true";
      if (document.visibilityState === "visible" && !currentOverride) {
        setOnline(userIdRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen for override changes from the Header toggle
    const handleOverrideChanged = (e: Event) => {
      const { offline } = (e as CustomEvent).detail;
      setAppearOfflineState(offline);
    };
    window.addEventListener("presence-override-changed", handleOverrideChanged);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT" && userIdRef.current && isMentorRef.current) {
        await setOffline(userIdRef.current);
        userIdRef.current = null;
        isMentorRef.current = false;
        setIsMentor(false);
      }
      if (event === "SIGNED_IN") {
        init();
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("presence-override-changed", handleOverrideChanged);
      subscription.unsubscribe();

      if (userIdRef.current && isMentorRef.current) {
        setOffline(userIdRef.current);
      }
    };
  }, []);

  return { appearOffline, setAppearOffline, isMentor };
}
