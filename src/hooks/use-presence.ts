import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Automatically marks an expert as online while they have the site open
 * (including background tabs) and offline when they close/navigate away.
 * Only activates for users who have the "mentor" role.
 */
export function usePresence() {
  const userIdRef = useRef<string | null>(null);
  const isMentorRef = useRef(false);

  const setOnline = async (userId: string) => {
    await supabase.from("profiles").update({ is_online: true }).eq("id", userId);
  };

  const setOffline = async (userId: string) => {
    await supabase.from("profiles").update({ is_online: false }).eq("id", userId);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) return;

      const userId = session.user.id;

      // Check if user is a mentor
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const isMentor = roles?.some((r) => r.role === "mentor") ?? false;

      if (!isMentor || !mounted) return;

      userIdRef.current = userId;
      isMentorRef.current = true;

      // Mark online immediately
      await setOnline(userId);
    };

    init();

    // Mark offline on tab/window close
    const handleBeforeUnload = () => {
      if (userIdRef.current && isMentorRef.current) {
        // Use sendBeacon for reliability on page unload
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userIdRef.current}`;
        const body = JSON.stringify({ is_online: false });
        navigator.sendBeacon(
          url,
          new Blob([body], { type: "application/json" })
        );
      }
    };

    // Also handle visibility changes (tab switching, minimizing)
    // We keep them online even in background — only go offline on unload
    const handleVisibilityChange = () => {
      if (!userIdRef.current || !isMentorRef.current) return;
      if (document.visibilityState === "visible") {
        // Re-confirm online when tab comes back to focus
        setOnline(userIdRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen for auth changes (sign out → go offline)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT" && userIdRef.current && isMentorRef.current) {
        await setOffline(userIdRef.current);
        userIdRef.current = null;
        isMentorRef.current = false;
      }
      if (event === "SIGNED_IN") {
        // Re-init after sign in
        init();
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();

      // Go offline on component unmount (shouldn't happen in App but safety net)
      if (userIdRef.current && isMentorRef.current) {
        setOffline(userIdRef.current);
      }
    };
  }, []);
}
