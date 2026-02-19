import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useModeration } from "@/hooks/use-moderation";
import RankBadge from "@/components/RankBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Check, Clock, Send, MessageSquare, XCircle, Eye, Users, ThumbsUp,
  ArrowLeft, Zap, Loader2, CreditCard, ShieldCheck, RefreshCw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

interface QuoteWithProfile {
  id: string;
  expert_id: string;
  price: number;
  estimated_minutes: number;
  message: string | null;
  created_at: string;
  status: string;
  profile?: {
    display_name: string | null;
    rating_avg: number | null;
    total_sessions: number | null;
    avatar_url: string | null;
  };
}

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  buyer_id: string;
  budget_min: number;
  budget_max: number;
  deadline_minutes: number;
}

const ActiveRequest = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkContent } = useModeration();

  const [job, setJob] = useState<Job | null>(null);
  const [quotes, setQuotes] = useState<QuoteWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isBuyer, setIsBuyer] = useState(false);

  // Chat state
  const [selectedChatPartnerId, setSelectedChatPartnerId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [sessionMap, setSessionMap] = useState<Record<string, string>>({});

  // Buyer profile (for seller view)
  const [buyerProfile, setBuyerProfile] = useState<{ display_name: string | null; avatar_url: string | null; total_spent?: number } | null>(null);

  // Stats
  const [onlineCount, setOnlineCount] = useState(0);

  // PayPal checkout state
  const [paypalDialog, setPaypalDialog] = useState<QuoteWithProfile | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const { format } = useCurrency();

  // Seller: new quote form state
  const [newQuotePrice, setNewQuotePrice] = useState("");
  const [newQuoteMinutes, setNewQuoteMinutes] = useState("");
  const [newQuoteUnit, setNewQuoteUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  // Load job + quotes
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

      if (!jobId) { navigate("/dashboard"); return; }

      const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (!jobData) { navigate("/dashboard"); return; }

      const userIsBuyer = jobData.buyer_id === user.id;
      setIsBuyer(userIsBuyer);

      if (!userIsBuyer) {
        const { data: myQuoteCheck } = await supabase.from("quotes").select("id").eq("job_id", jobId).eq("expert_id", user.id).maybeSingle();
        if (!myQuoteCheck) { navigate("/dashboard"); return; }
      }

      setJob(jobData);

      if (!userIsBuyer) {
        const { data: bp } = await supabase.from("profiles").select("display_name, avatar_url, total_spent").eq("id", jobData.buyer_id).single();
        if (bp) setBuyerProfile(bp);
      }

      const { data: quotesData } = await supabase
        .from("quotes")
        .select("id, expert_id, price, estimated_minutes, message, created_at, status")
        .eq("job_id", jobId)
        .order("price", { ascending: true });

      if (quotesData) {
        const withProfiles = await Promise.all(
          quotesData.map(async (q) => {
            const { data: profile } = await supabase.from("profiles").select("display_name, rating_avg, total_sessions, avatar_url").eq("id", q.expert_id).single();
            return { ...q, profile };
          })
        );
        setQuotes(withProfiles);
        if (userIsBuyer && withProfiles.length > 0) {
          setSelectedChatPartnerId(withProfiles[0].expert_id);
        } else if (!userIsBuyer) {
          setSelectedChatPartnerId(jobData.buyer_id);
        }
      }

      // Online count
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_online", true);
      setOnlineCount(count || 0);

      setLoading(false);
    };
    loadData();
  }, [jobId]);

  // Realtime: new quotes
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`quotes-${jobId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotes", filter: `job_id=eq.${jobId}` },
        async (payload) => {
          const q = payload.new as any;
          const { data: profile } = await supabase.from("profiles").select("display_name, rating_avg, total_sessions, avatar_url").eq("id", q.expert_id).single();
          setQuotes((prev) => {
            const exists = prev.find(p => p.id === q.id);
            if (exists) return prev;
            const updated = [...prev, { ...q, profile }];
            updated.sort((a, b) => a.price - b.price);
            return updated;
          });
          if (isBuyer && !selectedChatPartnerId) setSelectedChatPartnerId(q.expert_id);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes", filter: `job_id=eq.${jobId}` },
        async (payload) => {
          const q = payload.new as any;
          const { data: profile } = await supabase.from("profiles").select("display_name, rating_avg, total_sessions, avatar_url").eq("id", q.expert_id).single();
          setQuotes((prev) => {
            const updated = prev.map(p => p.id === q.id ? { ...q, profile } as QuoteWithProfile : p);
            updated.sort((a, b) => a.price - b.price);
            return updated;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, selectedChatPartnerId, isBuyer]);

  // Load sessions, create if missing — each party inserts only their own auto-message
  useEffect(() => {
    if (!jobId || !userId || quotes.length === 0 || !job) return;

    const formatDeliveryTimeLocal = (minutes: number) => {
      if (minutes >= 1440) return `${Math.round(minutes / 1440)} day${Math.round(minutes / 1440) !== 1 ? "s" : ""}`;
      if (minutes >= 60) return `${Math.round(minutes / 60)} hour${Math.round(minutes / 60) !== 1 ? "s" : ""}`;
      return `${minutes} min`;
    };

    // Returns [sessionId, isNew]
    const findOrCreateSession = async (mentorId: string, menteeId: string): Promise<[string | null, boolean]> => {
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("mentor_id", mentorId)
        .eq("mentee_id", menteeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return [existing.id, false];

      const { data: newSession } = await supabase.from("sessions").insert({
        mentor_id: mentorId,
        mentee_id: menteeId,
        status: "pending",
        issue_description: job.title,
        categories: [job.category],
        session_type: "chat",
      }).select("id").single();

      return [newSession?.id || null, true];
    };

    // Each party inserts only their own auto-message (RLS: sender_id = auth.uid())
    const sendAutoMessage = async (sid: string, isNew: boolean) => {
      if (!isNew || !userId) return;

      if (isBuyer) {
        const budgetLine = `\n💰 Budget: €${job.budget_min} – €${job.budget_max}`;
        const deadlineLine = `\n⏱ Deadline: ${formatDeliveryTimeLocal(job.deadline_minutes)}`;
        const descLine = job.description ? `\n\n📄 Details:\n${job.description}` : "";
        const content = `📋 Order Request\n\n📌 ${job.title}\n🏷 Category: ${job.category}${budgetLine}${deadlineLine}${descLine}`;
        await supabase.from("messages").insert({ session_id: sid, sender_id: userId, content });
      } else {
        const sellerQuote = quotes.find(q => q.expert_id === userId);
        if (sellerQuote) {
          const content = `📋 New offer: €${sellerQuote.price.toFixed(2)} — delivery in ${formatDeliveryTimeLocal(sellerQuote.estimated_minutes)}`;
          await supabase.from("messages").insert({ session_id: sid, sender_id: userId, content });
        }
      }
    };

    const loadSessions = async () => {
      if (isBuyer) {
        for (const quote of quotes) {
          if (sessionMap[quote.expert_id]) continue;
          const [sid, isNew] = await findOrCreateSession(quote.expert_id, userId!);
          if (sid) {
            setSessionMap((prev) => ({ ...prev, [quote.expert_id]: sid }));
            await sendAutoMessage(sid, isNew);
          }
        }
      } else {
        if (sessionMap[job.buyer_id]) return;
        const [sid, isNew] = await findOrCreateSession(userId!, job.buyer_id);
        if (sid) {
          setSessionMap({ [job.buyer_id]: sid });
          await sendAutoMessage(sid, isNew);
        }
      }
    };
    loadSessions();
  }, [quotes, jobId, userId, isBuyer, job]);

  // Load messages for selected chat partner
  useEffect(() => {
    if (!selectedChatPartnerId) return;
    const sid = sessionMap[selectedChatPartnerId];
    if (!sid) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });
      if (data) {
        setChatMessages((prev) => ({ ...prev, [selectedChatPartnerId]: data }));
      }
    };
    loadMessages();

    const channel = supabase
      .channel(`chat-${sid}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `session_id=eq.${sid}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setChatMessages((prev) => {
          const partnerId = selectedChatPartnerId;
          const existing = prev[partnerId] || [];
          if (existing.find(m => m.id === newMsg.id)) return prev;
          const filtered = existing.filter(m => !(m.id.startsWith("temp-") && m.content === newMsg.content && m.sender_id === newMsg.sender_id));
          return { ...prev, [partnerId]: [...filtered, newMsg] };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChatPartnerId, sessionMap]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedChatPartnerId]);

  const handleAcceptQuote = (quote: QuoteWithProfile) => {
    setPaypalDialog(quote);
  };

  const handlePayPalCheckout = async () => {
    if (!paypalDialog || !jobId) return;
    setPaypalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const createRes = await supabase.functions.invoke("paypal-create-order", {
        body: { quoteId: paypalDialog.id, jobId },
      });
      if (createRes.error) throw new Error(createRes.error.message);
      if (createRes.data?.error) throw new Error(createRes.data.error);

      const { paypalOrderId, approvalUrl } = createRes.data;
      if (!approvalUrl) throw new Error("No PayPal approval URL received");

      const paypalWindow = window.open(approvalUrl, "_blank", "width=500,height=700");

      const pollInterval = setInterval(async () => {
        try {
          const captureRes = await supabase.functions.invoke("paypal-capture-order", {
            body: { paypalOrderId, quoteId: paypalDialog.id, jobId },
          });

          if (captureRes.data?.success) {
            clearInterval(pollInterval);
            paypalWindow?.close();

            const otherExperts = quotes
              .filter(q => q.expert_id !== paypalDialog.id && q.expert_id !== paypalDialog.expert_id)
              .map(q => q.expert_id);
            if (otherExperts.length > 0 && userId) {
              const { data: sessionsToDelete } = await supabase
                .from("sessions")
                .select("id")
                .in("mentor_id", otherExperts)
                .eq("mentee_id", userId)
                .eq("status", "pending");
              if (sessionsToDelete && sessionsToDelete.length > 0) {
                const sids = sessionsToDelete.map(s => s.id);
                await supabase.from("messages").delete().in("session_id", sids);
                await supabase.from("sessions").delete().in("id", sids);
              }
            }

            toast({
              title: "Payment successful! 🎉",
              description: `Payment confirmed. ${paypalDialog.profile?.display_name || "The expert"} will start working now.`,
            });
            setPaypalDialog(null);
            setPaypalLoading(false);
            navigate(`/order/${jobId}`);
          }
        } catch {
          // keep polling
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (paypalLoading) {
          setPaypalLoading(false);
          toast({ title: "Payment timeout", description: "Please try again if you haven't completed payment.", variant: "destructive" });
        }
      }, 300000);
    } catch (err: any) {
      console.error("PayPal checkout error:", err);
      toast({ title: "Checkout error", description: err.message, variant: "destructive" });
      setPaypalLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!jobId) return;
    await supabase.from("jobs").update({ status: "cancelled" }).eq("id", jobId);
    toast({ title: "Request cancelled" });
    navigate("/dashboard");
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !selectedChatPartnerId || !userId) return;
    const sid = sessionMap[selectedChatPartnerId];
    if (!sid) return;
    setSendingChat(true);
    const messageContent = chatInput.trim();

    const flagged = await checkContent(messageContent, "chat message");
    if (flagged) { setSendingChat(false); return; }

    setChatInput("");

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: userId,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => ({
      ...prev,
      [selectedChatPartnerId]: [...(prev[selectedChatPartnerId] || []), optimisticMsg],
    }));

    const { error } = await supabase.from("messages").insert({
      session_id: sid,
      sender_id: userId,
      content: messageContent,
    });
    if (error) {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
      setChatMessages((prev) => ({
        ...prev,
        [selectedChatPartnerId]: (prev[selectedChatPartnerId] || []).filter(m => m.id !== optimisticMsg.id),
      }));
    }
    setSendingChat(false);
  };

  const formatDeliveryTime = (minutes: number) => {
    if (minutes >= 1440) return `${Math.round(minutes / 1440)} day${Math.round(minutes / 1440) !== 1 ? "s" : ""}`;
    if (minutes >= 60) return `${Math.round(minutes / 60)} hour${Math.round(minutes / 60) !== 1 ? "s" : ""}`;
    return `${minutes} min`;
  };

  const handleSubmitNewQuote = async () => {
    if (!jobId || !userId) return;
    const price = parseFloat(newQuotePrice);
    const rawValue = parseInt(newQuoteMinutes) || 20;
    const minutes = newQuoteUnit === "days" ? rawValue * 1440 : newQuoteUnit === "hours" ? rawValue * 60 : rawValue;
    if (isNaN(price) || price <= 0) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }
    setSubmittingQuote(true);
    const existingQuote = quotes.find(q => q.expert_id === userId);
    let error: any;
    if (existingQuote) {
      const res = await supabase.from("quotes").update({
        price,
        estimated_minutes: minutes,
        message: `Updated offer: €${price.toFixed(2)} — ${formatDeliveryTime(minutes)} delivery`,
      }).eq("id", existingQuote.id);
      error = res.error;
    } else {
      const res = await supabase.from("quotes").insert({
        job_id: jobId,
        expert_id: userId,
        price,
        estimated_minutes: minutes,
        message: `Updated offer: €${price.toFixed(2)} — ${formatDeliveryTime(minutes)} delivery`,
      });
      error = res.error;
    }
    if (error) {
      toast({ title: "Failed to submit offer", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "New offer submitted! 🎉" });
      setNewQuotePrice("");
      setNewQuoteMinutes("");
      setShowQuoteForm(false);
      const sid = sessionMap[selectedChatPartnerId || ""];
      if (sid) {
        await supabase.from("messages").insert({
          session_id: sid,
          sender_id: userId,
          content: `📋 New offer: €${price.toFixed(2)} — delivery in ${formatDeliveryTime(minutes)}`,
        });
      }
    }
    setSubmittingQuote(false);
  };

  const selectedMessages = selectedChatPartnerId ? (chatMessages[selectedChatPartnerId] || []) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) return null;

  const sortedQuotes = [...quotes].sort((a, b) => a.price - b.price);

  const recommendedId = sortedQuotes.length > 0 ? (() => {
    const maxPrice = Math.max(...sortedQuotes.map(q => q.price), 1);
    return sortedQuotes.reduce((best, curr) => {
      const currScore = (1 - curr.price / maxPrice) * 0.5 + ((curr.profile?.rating_avg || 0) / 5) * 0.5;
      const bestScore = (1 - best.price / maxPrice) * 0.5 + ((best.profile?.rating_avg || 0) / 5) * 0.5;
      return currScore > bestScore ? curr : best;
    }).id;
  })() : null;

  const fastestId = sortedQuotes.length > 0
    ? sortedQuotes.reduce((prev, curr) => curr.estimated_minutes < prev.estimated_minutes ? curr : prev).id
    : null;

  const myQuote = !isBuyer ? quotes.find(q => q.expert_id === userId) : null;
  const selectedQuote = isBuyer
    ? quotes.find(q => q.expert_id === selectedChatPartnerId)
    : myQuote;

  const chatPartnerName = isBuyer
    ? selectedQuote?.profile?.display_name || "Expert"
    : buyerProfile?.display_name || "Buyer";

  // Helper: render a message bubble with special styling for auto-messages
  const renderMessageBubble = (msg: ChatMessage, isMe: boolean) => {
    const isOfferMsg = msg.content.startsWith("📋 New offer:");
    const isJobMsg = msg.content.startsWith("📋 Order Request");
    const isAutoMsg = isOfferMsg || isJobMsg;

    return (
      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
          {isAutoMsg ? (
            <div className={`rounded-xl px-3 py-2.5 text-sm border ${
              isOfferMsg
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/60 border-border text-foreground"
            }`}>
              <p className="font-semibold text-[10px] mb-1.5 opacity-70 uppercase tracking-wide">
                {isOfferMsg ? "💼 Offer" : "📄 Order Details"}
              </p>
              <p className="whitespace-pre-wrap text-sm">
                {isOfferMsg
                  ? msg.content.replace("📋 New offer:", "").trim()
                  : msg.content.replace("📋 Order Request\n\n", "").trim()}
              </p>
              <p className="text-[10px] mt-1.5 opacity-60">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </p>
            </div>
          ) : (
            <div className={`rounded-2xl px-3 py-2 text-sm ${
              isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted/50 text-foreground rounded-bl-sm"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Seller-only: full-screen messenger layout ─────────────────────────────
  if (!isBuyer && myQuote) {
    const msgs = chatMessages[selectedChatPartnerId || ""] || [];
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{job.title}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-primary/20 text-primary/80">{job.category}</Badge>
              <Badge variant="secondary" className="text-[10px]">Seller View</Badge>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Your offer</p>
            <p className="text-base font-bold text-primary">{format(myQuote.price)}</p>
          </div>
        </div>

        {/* Split pane */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar — job context */}
          <div className="hidden md:flex flex-col w-72 border-r border-border bg-card/40 shrink-0 overflow-y-auto">
            {/* Buyer info */}
            <div className="p-4 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Client</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={buyerProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {buyerProfile?.display_name?.split(" ").map(n => n[0]).join("") || "B"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm text-foreground">{buyerProfile?.display_name || "Buyer"}</p>
                  <p className="text-xs text-muted-foreground">Buyer</p>
                </div>
              </div>
            </div>

            {/* Job details */}
            <div className="p-4 border-b border-border space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Request</p>
              <p className="text-sm text-foreground font-medium">{job.title}</p>
              <Badge variant="outline" className="text-[10px]">{job.category}</Badge>
              {job.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{job.description}</p>
              )}
              <div className="flex gap-3 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground">Budget</p>
                  <p className="text-xs font-semibold text-foreground">€{job.budget_min}–€{job.budget_max}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Deadline</p>
                  <p className="text-xs font-semibold text-foreground">{formatDeliveryTime(job.deadline_minutes)}</p>
                </div>
              </div>
            </div>

            {/* Your offer */}
            <div className="p-4 border-b border-border space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your Offer</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-bold text-primary">{format(myQuote.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium text-foreground">{formatDeliveryTime(myQuote.estimated_minutes)}</span>
              </div>
            </div>

            {/* Update offer */}
            <div className="p-4 space-y-2 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Update Offer</p>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Price (€)"
                  value={newQuotePrice}
                  onChange={(e) => setNewQuotePrice(e.target.value)}
                  className="text-sm h-8 bg-background/60"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Time"
                    value={newQuoteMinutes}
                    onChange={(e) => setNewQuoteMinutes(e.target.value)}
                    className="text-sm h-8 bg-background/60 flex-1"
                  />
                  <select
                    value={newQuoteUnit}
                    onChange={(e) => setNewQuoteUnit(e.target.value as any)}
                    className="text-xs border border-border rounded-md px-2 h-8 bg-background text-foreground"
                  >
                    <option value="minutes">min</option>
                    <option value="hours">hrs</option>
                    <option value="days">days</option>
                  </select>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={handleSubmitNewQuote}
                  disabled={submittingQuote || !newQuotePrice}
                >
                  {submittingQuote ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Update Offer
                </Button>
              </div>
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/20 shrink-0">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={buyerProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {buyerProfile?.display_name?.[0] || "B"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{buyerProfile?.display_name || "Buyer"}</p>
                <p className="text-xs text-muted-foreground">Chat with buyer</p>
              </div>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-3">
                {msgs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center mb-4">
                      <MessageSquare className="h-7 w-7 text-primary/50" />
                    </div>
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs mt-1 opacity-60">Start the conversation</p>
                  </div>
                ) : (
                  msgs.map((msg) => renderMessageBubble(msg, msg.sender_id === userId))
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Chat input */}
            <div className="border-t border-border p-3 shrink-0 bg-card/20">
              <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Say something..."
                  className="bg-background/60 border-border/40 focus:border-primary/40"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                />
                <Button type="submit" size="icon" disabled={!chatInput.trim() || sendingChat} className="shrink-0">
                  {sendingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Buyer layout ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="mt-0.5 h-8 w-8 shrink-0" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight truncate">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-xs border-primary/20 text-primary/80">{job.category}</Badge>
                <Badge variant={job.status === "open" ? "default" : "secondary"} className="text-xs capitalize">{job.status}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {onlineCount} online
                </span>
              </div>
            </div>
            {isBuyer && job.status === "open" && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0" onClick={handleCancelRequest}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Offers leaderboard */}
        <div className="mb-6 sm:mb-8 animate-fade-in [animation-delay:200ms]">
          {quotes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground mb-1">Waiting for offers</p>
                <p className="text-sm text-muted-foreground">Experts are reviewing your request</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-primary" />
                  {quotes.length} offer{quotes.length !== 1 ? "s" : ""} received
                </h2>
                <span className="text-xs text-muted-foreground">Sorted by price</span>
              </div>
              <div className="space-y-2">
                {sortedQuotes.map((quote, i) => {
                  const isSelected = selectedChatPartnerId === quote.expert_id;
                  const isRecommended = quote.id === recommendedId;
                  const isFastest = quote.id === fastestId;
                  const hasQuoted = isBuyer; // buyer always sees full leaderboard if they've already got quotes
                  return (
                    <div
                      key={quote.id}
                      onClick={() => setSelectedChatPartnerId(quote.expert_id)}
                      className={`relative rounded-xl border p-3 sm:p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/20 hover:bg-card/80"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={quote.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                              {quote.profile?.display_name?.[0] || "E"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{quote.profile?.display_name || "Expert"}</p>
                            {isRecommended && <Badge className="text-[10px] h-4 bg-primary/90">Recommended</Badge>}
                            {isFastest && !isRecommended && <Badge variant="outline" className="text-[10px] h-4 border-amber-500/30 text-amber-500">Fastest</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {quote.profile?.rating_avg && quote.profile.rating_avg > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {quote.profile.rating_avg.toFixed(1)}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {formatDeliveryTime(quote.estimated_minutes)}
                            </span>
                            {quote.profile?.total_sessions && (
                              <span className="text-xs text-muted-foreground">{quote.profile.total_sessions} sessions</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-primary">{format(quote.price)}</p>
                          {isBuyer && (
                            <Button
                              size="sm"
                              className="mt-1 h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleAcceptQuote(quote); }}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Accept & Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="animate-fade-in [animation-delay:400ms]">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            {isBuyer ? "Live chat with sellers" : `Chat with ${buyerProfile?.display_name || "Buyer"}`}
          </h2>

          {/* Tabs (buyer: one tab per expert) */}
          {isBuyer && quotes.length > 1 && (
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {sortedQuotes.map((q) => (
                <button
                  key={q.expert_id}
                  onClick={() => setSelectedChatPartnerId(q.expert_id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    selectedChatPartnerId === q.expert_id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[8px]">{q.profile?.display_name?.[0] || "E"}</AvatarFallback>
                  </Avatar>
                  {q.profile?.display_name || "Expert"}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card/40 overflow-hidden flex flex-col" style={{ height: "420px" }}>
            {/* Chat header */}
            {selectedQuote && (
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/60 shrink-0">
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarImage src={isBuyer ? (selectedQuote.profile?.avatar_url || undefined) : (buyerProfile?.avatar_url || undefined)} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {chatPartnerName[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{chatPartnerName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isBuyer ? `${format(selectedQuote.price)} · ${formatDeliveryTime(selectedQuote.estimated_minutes)} delivery` : "Buyer"}
                  </p>
                </div>
                {!isBuyer && myQuote && (
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Your offer</span>
                    <p className="text-lg font-bold text-primary">{format(myQuote.price)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 min-h-0">
              <div className="space-y-3">
                {selectedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 opacity-30 mb-2" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  selectedMessages.map((msg) => renderMessageBubble(msg, msg.sender_id === userId))
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Chat input */}
            <div className="border-t border-border p-3 shrink-0 bg-card/20">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                className="flex gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-background/60 border-border/40 focus:border-primary/40"
                />
                <Button type="submit" size="icon" disabled={!chatInput.trim() || sendingChat}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* PayPal Checkout Dialog — buyer only */}
      <Dialog open={!!paypalDialog} onOpenChange={() => { if (!paypalLoading) setPaypalDialog(null); }}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Confirm & Pay
            </DialogTitle>
            <DialogDescription>
              Funds will be held in escrow until you confirm delivery.
            </DialogDescription>
          </DialogHeader>
          {paypalDialog && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background/40 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service price</span>
                  <span className="font-medium text-foreground">€{paypalDialog.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buyer fee (5%)</span>
                  <span className="font-medium text-foreground">€{(paypalDialog.price * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary">€{(paypalDialog.price * 1.05).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                Funds are held securely in escrow and released to the expert only after you confirm delivery.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaypalDialog(null)} disabled={paypalLoading}>Cancel</Button>
            <Button onClick={handlePayPalCheckout} disabled={paypalLoading} className="gap-2">
              {paypalLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Pay with PayPal</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveRequest;
