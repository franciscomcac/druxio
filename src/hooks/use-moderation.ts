import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useModeration = () => {
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

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

  return { checkContent, checking };
};
