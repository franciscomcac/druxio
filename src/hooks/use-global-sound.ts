import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSound } from "./use-notification-sound";

/**
 * Mounted once at the App level.
 * Plays a chime whenever the current user receives:
 *  - a new notification
 *  - a new chat message in any session they participate in
 *  - a new quote on a job they posted
 */
export function useGlobalSound() {
  const play = useNotificationSound();

  useEffect(() => {
    let userId: string | null = null;
    let channels: ReturnType<typeof supabase.channel>[] = [];

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      userId = session.user.id;

      // 1. New notifications
      const notifChannel = supabase
        .channel("global-sound-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => play()
        )
        .subscribe();

      // 2. New chat messages (where sender is NOT the current user)
      const msgChannel = supabase
        .channel("global-sound-messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const msg = payload.new as { sender_id: string };
            if (msg.sender_id !== userId) {
              play();
            }
          }
        )
        .subscribe();

      // 3. New quotes on jobs posted by the current user (buyer gets notified of new offers)
      const quoteChannel = supabase
        .channel("global-sound-quotes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "quotes",
          },
          async (payload) => {
            const quote = payload.new as { job_id: string; expert_id: string };
            // Only play if the quote is NOT from the current user
            if (quote.expert_id === userId) return;
            // Check if the job belongs to the current user
            const { data } = await supabase
              .from("jobs")
              .select("buyer_id")
              .eq("id", quote.job_id)
              .single();
            if (data?.buyer_id === userId) {
              play();
            }
          }
        )
        .subscribe();

      channels = [notifChannel, msgChannel, quoteChannel];
    };

    setup();

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [play]);
}
