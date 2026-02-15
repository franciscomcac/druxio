import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useModeration = () => {
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  /**
   * Hard check — blocks content if flagged (for posts, requests, etc.)
   */
  const checkContent = async (
    text: string,
    context?: string
  ): Promise<boolean> => {
    if (!text || text.trim().length < 3) return false;

    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("moderate-content", {
        body: { text, context },
      });

      if (error) {
        console.error("Moderation check error:", error);
        return false; // fail open
      }

      if (data?.flagged) {
        toast({
          title: "Content not allowed",
          description: data.reason || "Your message contains inappropriate content. Please revise it.",
          variant: "destructive",
        });
        return true; // content IS flagged
      }

      return false; // content is clean
    } catch (err) {
      console.error("Moderation error:", err);
      return false; // fail open
    } finally {
      setChecking(false);
    }
  };

  /**
   * Soft check — never blocks, but silently alerts admins if flagged.
   * Use for chat between buyers and sellers.
   */
  const softCheckContent = async (
    text: string,
    context?: string,
    metadata?: { job_id?: string; sender_id?: string }
  ): Promise<void> => {
    if (!text || text.trim().length < 5) return;

    try {
      const { data, error } = await supabase.functions.invoke("moderate-content", {
        body: { text, context },
      });

      if (error || !data?.flagged) return;

      // Silently notify all admins
      const { data: adminRoles } = await supabase
        .from("user_roles").select("user_id").eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        await Promise.all(adminRoles.map((a) =>
          supabase.from("notifications").insert({
            user_id: a.user_id,
            type: "moderation_alert",
            title: "Flagged chat message",
            message: `"${text.slice(0, 200)}" — Reason: ${data.reason || "Flagged by AI"}`,
            data: { ...metadata, flagged_text: text.slice(0, 500) },
          })
        ));
      }
    } catch {
      // Silent — never block chat
    }
  };

  return { checkContent, softCheckContent, checking };
};
