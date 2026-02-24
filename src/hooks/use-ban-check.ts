import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBanCheck = () => {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("profiles")
        .select("is_banned, ban_reason")
        .eq("id", user.id)
        .single();

      if (data) {
        setIsBanned(data.is_banned || false);
        setBanReason((data as any).ban_reason || null);
      }
      setLoading(false);
    };
    check();
  }, []);

  return { isBanned, banReason, loading };
};
