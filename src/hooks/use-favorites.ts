import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchFavorites(session.user.id);
      }
    });
  }, []);

  const fetchFavorites = async (uid: string) => {
    const { data } = await supabase
      .from("favorites")
      .select("expert_id")
      .eq("user_id", uid);
    setFavorites(data?.map(f => f.expert_id) || []);
  };

  const toggleFavorite = async (expertId: string) => {
    if (!userId) return false;

    if (favorites.includes(expertId)) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("expert_id", expertId);
      setFavorites(prev => prev.filter(id => id !== expertId));
    } else {
      await supabase.from("favorites").insert({ user_id: userId, expert_id: expertId });
      setFavorites(prev => [...prev, expertId]);
    }
    return true;
  };

  const isFavorite = (expertId: string) => favorites.includes(expertId);

  return { favorites, toggleFavorite, isFavorite };
};
