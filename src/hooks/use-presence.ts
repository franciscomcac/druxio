import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const APPEAR_OFFLINE_KEY = "appear_offline_override";
const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute

/**
 * Automatically marks an expert as online while they have the site open
 * and offline when they close/navigate away.
 * Sends a heartbeat every 60s so stale sessions are detected.
 * Supports a manual "appear offline" override.
 * Only activates for users who have the "mentor" role.
 */
export function usePresence() {
  const userIdRef = useRef<string | null>(null);
  const isMentorRef = useRef(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [appearOffline, setAppearOfflineState] = useState(false);
  const [isMentor, setIsMentor] = useState(false);

  const heartbeat = async (userId: string) => {
    await supabase
      .from("profiles")
      .update({ is_online: true, last_seen_at: new Date().toISOString() } as any)
      .eq("id", userId);
  };

  const setOffline = async (userId: string) => {
    await supabase
      .from("profiles")
      .update({ is_online: false, last_seen_at: new Date().toISOString() } as any)
      .eq("id", userId);
  };

  const startHeartbeat = (userId: string) => {
    stopHeartbeat();
    heartbeat(userId); // immediate first beat
    heartbeatRef.current = setInterval(() => heartbeat(userId), HEARTBEAT_INTERVAL_MS);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const setAppearOffline = useCallback(async (offline: boolean) => {
    setAppearOfflineState(offline);
    localStorage.setItem(APPEAR_OFFLINE_KEY, offline ? "true" : "false");

    if (!userIdRef.current || !isMentorRef.current) return;

    if (offline) {
      stopHeartbeat();
      await setOffline(userIdRef.current);
    } else {
      startHeartbeat(userIdRef.current);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

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

        if (!isOverrideOffline) {
          startHeartbeat(userId);
        } else {
          await setOffline(userId);
        }
      }
    };

    init();

    // Use sendBeacon with proper headers for tab close
    const handleBeforeUnload = () => {
      if (userIdRef.current && isMentorRef.current) {
        stopHeartbeat();
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userIdRef.current}`;
        const headers = {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "Prefer": "return=minimal",
        };
        // sendBeacon doesn't support custom headers, so use fetch keepalive instead
        fetch(url, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ is_online: false, last_seen_at: new Date().toISOString() }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (!userIdRef.current || !isMentorRef.current) return;
      const currentOverride = localStorage.getItem(APPEAR_OFFLINE_KEY) === "true";
      if (document.visibilityState === "visible" && !currentOverride) {
        startHeartbeat(userIdRef.current);
      } else if (document.visibilityState === "hidden") {
        stopHeartbeat();
        // Don't set offline immediately — the cleanup function handles stale users
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleOverrideChanged = (e: Event) => {
      const { offline } = (e as CustomEvent).detail;
      setAppearOfflineState(offline);
    };
    window.addEventListener("presence-override-changed", handleOverrideChanged);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT" && userIdRef.current && isMentorRef.current) {
        stopHeartbeat();
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
      stopHeartbeat();
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
