import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BalanceData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  totalRefunded: number;
  totalDeposited: number;
  loading: boolean;
}

export function useBalance() {
  const [data, setData] = useState<BalanceData>({
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    totalRefunded: 0,
    totalDeposited: 0,
    loading: true,
  });
  const [userId, setUserId] = useState<string | null>(null);

  const computeBalance = (txns: any[]) => {
    const spent = txns.filter(t => t.type === "session_payment" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const earned = txns.filter(t => t.type === "session_earning" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const refunded = txns.filter(t => t.type === "refund" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const deposited = txns.filter(t => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const withdrawn = txns.filter(t => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + t.amount, 0);

    setData({
      balance: deposited + earned + refunded - spent - withdrawn,
      totalEarned: earned,
      totalSpent: spent,
      totalRefunded: refunded,
      totalDeposited: deposited,
      loading: false,
    });
  };

  const fetchTransactions = async (uid: string) => {
    const { data: txns } = await supabase
      .from("transactions")
      .select("type, amount, status")
      .eq("user_id", uid);
    if (txns) computeBalance(txns);
    else setData(prev => ({ ...prev, loading: false }));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchTransactions(session.user.id);
      } else {
        setData(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchTransactions(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setData({ balance: 0, totalEarned: 0, totalSpent: 0, totalRefunded: 0, totalDeposited: 0, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime: refetch on any transaction change for this user
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("balance-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "transactions",
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchTransactions(userId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return data;
}
