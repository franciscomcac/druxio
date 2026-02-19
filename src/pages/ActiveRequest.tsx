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
  const [sessionMap, setSessionMap] = useState<Record<string, string>>({}); // partnerId -> sessionId

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

      // If seller, check they have a quote on this job
      if (!userIsBuyer) {
        const { data: myQuote } = await supabase.from("quotes").select("id").eq("job_id", jobId).eq("expert_id", user.id).maybeSingle();
        if (!myQuote) { navigate("/dashboard"); return; }
      }

      setJob(jobData);

      // Fetch buyer profile (for seller view header)
      if (!userIsBuyer) {
        const { data: bp } = await supabase.from("profiles").select("display_name, avatar_url, total_spent").eq("id", jobData.buyer_id).single();
        setBuyerProfile(bp);
      }

      const mainCat = jobData.category.split(":")[0]?.trim() || jobData.category;
      const { count } = await supabase.from("expert_categories").select("*", { count: "exact", head: true }).ilike("category", `%${mainCat}%`);
      setOnlineCount(count || 0);

      // Load quotes with profiles
      const { data: quotesData } = await supabase.from("quotes").select("*").eq("job_id", jobId);
      if (quotesData) {
        const enriched = await Promise.all(quotesData.map(async (q) => {
          const { data: profile } = await supabase.from("profiles").select("display_name, rating_avg, total_sessions, avatar_url").eq("id", q.expert_id).single();
          return { ...q, profile } as QuoteWithProfile;
        }));
        enriched.sort((a, b) => a.price - b.price);
        setQuotes(enriched);

        if (userIsBuyer) {
          if (enriched.length > 0) setSelectedChatPartnerId(enriched[0].expert_id);
        } else {
          // Seller: chat partner is the buyer
          setSelectedChatPartnerId(jobData.buyer_id);
        }
      }

      setLoading(false);
    };
    loadData();
  }, [jobId, navigate]);

  // Realtime quotes subscription
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`quotes-live-${jobId}`)
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

  // Load sessions (expert <-> buyer mapping), create if missing for both sides
  useEffect(() => {
    if (!jobId || !userId || quotes.length === 0 || !job) return;

    const findOrCreateSession = async (mentorId: string, menteeId: string): Promise<string | null> => {
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("mentor_id", mentorId)
        .eq("mentee_id", menteeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) return existing.id;

      const { data: newSession } = await supabase.from("sessions").insert({
        mentor_id: mentorId,
        mentee_id: menteeId,
        status: "pending",
        issue_description: job.title,
        categories: [job.category],
        session_type: "chat",
      }).select("id").single();

      const sid = newSession?.id;
      if (!sid) return null;

      // Auto-send welcome messages on newly created sessions
      const sellerQuote = quotes.find(q => q.expert_id === mentorId);
      const msgs: { session_id: string; sender_id: string; content: string }[] = [];

      // 1. Buyer sends job details automatically
      const budgetLine = job.budget_min && job.budget_max
        ? `\n💰 Budget: €${job.budget_min} – €${job.budget_max}`
        : "";
      const deadlineLine = job.deadline_minutes
        ? `\n⏱ Deadline: ${formatDeliveryTime(job.deadline_minutes)}`
        : "";
      const descLine = job.description ? `\n\n📄 Details:\n${job.description}` : "";
      const buyerMsg = `📋 Order Request\n\n📌 ${job.title}\n🏷 Category: ${job.category}${budgetLine}${deadlineLine}${descLine}`;
      msgs.push({ session_id: sid, sender_id: menteeId, content: buyerMsg });

      // 2. Seller sends their offer automatically
      if (sellerQuote) {
        const offerMsg = `📋 New offer: €${sellerQuote.price.toFixed(2)} — delivery in ${formatDeliveryTime(sellerQuote.estimated_minutes)}`;
        msgs.push({ session_id: sid, sender_id: mentorId, content: offerMsg });
      }

      if (msgs.length > 0) {
        await supabase.from("messages").insert(msgs);
      }

      return sid;
    };

    const loadSessions = async () => {
      if (isBuyer) {
        for (const quote of quotes) {
          if (sessionMap[quote.expert_id]) continue;
          const sid = await findOrCreateSession(quote.expert_id, userId);
          if (sid) {
            setSessionMap((prev) => ({ ...prev, [quote.expert_id]: sid }));
          }
        }
      } else {
        if (sessionMap[job.buyer_id]) return;
        const sid = await findOrCreateSession(userId, job.buyer_id);
        if (sid) {
          setSessionMap({ [job.buyer_id]: sid });
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
          // Also deduplicate optimistic messages by content+sender
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

      // Step 1: Create PayPal order
      const createRes = await supabase.functions.invoke("paypal-create-order", {
        body: { quoteId: paypalDialog.id, jobId },
      });
      if (createRes.error) throw new Error(createRes.error.message);
      if (createRes.data?.error) throw new Error(createRes.data.error);

      const { paypalOrderId, approvalUrl } = createRes.data;

      if (!approvalUrl) throw new Error("No PayPal approval URL received");

      // Open PayPal approval in new window
      const paypalWindow = window.open(approvalUrl, "_blank", "width=500,height=700");

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const captureRes = await supabase.functions.invoke("paypal-capture-order", {
            body: { paypalOrderId, quoteId: paypalDialog.id, jobId },
          });

          if (captureRes.data?.success) {
            clearInterval(pollInterval);
            paypalWindow?.close();

            // Delete sessions with all OTHER sellers who quoted on this job
            // (the accepted expert keeps their session, which becomes the order chat)
            const otherExperts = quotes
              .filter(q => q.expert_id !== paypalDialog.id && q.expert_id !== paypalDialog.expert_id)
              .map(q => q.expert_id);
            if (otherExperts.length > 0 && userId) {
              // Find and delete those pending sessions
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
          // Payment not yet completed, keep polling
        }
      }, 3000);

      // Stop polling after 5 minutes
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

    // Optimistically add message to UI
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
      // Remove optimistic message on error
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
    // Find existing quote to update
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
      // Send a chat message about the new offer
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
  
  // Recommended = best composite score: lower price + higher rating (normalized)
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

  // For buyer: selected quote is the selected expert
  // For seller: the selected quote to show in chat header is the seller's own quote
  const myQuote = !isBuyer ? quotes.find(q => q.expert_id === userId) : null;
  const selectedQuote = isBuyer
    ? quotes.find(q => q.expert_id === selectedChatPartnerId)
    : myQuote;

  // Chat partner info for seller view
  const chatPartnerName = isBuyer
    ? selectedQuote?.profile?.display_name || "Expert"
    : buyerProfile?.display_name || "Buyer";

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
              {job.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{job.description}</p>
              )}
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
              {myQuote.message && (
                <p className="text-xs text-muted-foreground italic mt-1">"{myQuote.message}"</p>
              )}
            </div>

            {/* Update offer */}
            <div className="p-4 space-y-2 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Update Offer</p>
              <div className="space-y-2">
                <Input
                  type="number" step="0.01" min="0.50"
                  value={newQuotePrice}
                  onChange={(e) => setNewQuotePrice(e.target.value)}
                  placeholder="New price..."
                  className="bg-background/60 border-border h-8 text-sm"
                />
                <div className="flex gap-1.5">
                  <Input
                    type="number" min="1"
                    value={newQuoteMinutes}
                    onChange={(e) => setNewQuoteMinutes(e.target.value)}
                    placeholder="Delivery"
                    className="bg-background/60 border-border h-8 text-sm flex-1"
                  />
                  <div className="flex rounded-md border border-border overflow-hidden h-8 shrink-0">
                    {(["minutes", "hours", "days"] as const).map((unit) => (
                      <button key={unit} type="button" onClick={() => setNewQuoteUnit(unit)}
                        className={`px-2 text-xs font-medium transition-colors ${newQuoteUnit === unit ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
                        {unit === "minutes" ? "min" : unit === "hours" ? "hr" : "day"}
                      </button>
                    ))}
                  </div>
                </div>
                <Button size="sm" className="w-full gap-1.5 h-8 text-xs" onClick={handleSubmitNewQuote}
                  disabled={submittingQuote || !newQuotePrice || !newQuoteMinutes}>
                  {submittingQuote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Send Updated Offer
                </Button>
              </div>
            </div>

            {/* Live stats */}
            <div className="p-4 mt-auto">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  Live · {quotes.length} offers
                </span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {onlineCount}</span>
              </div>
            </div>
          </div>

          {/* Right: full-height chat */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {selectedChatPartnerId && sessionMap[selectedChatPartnerId] ? (
              <>
                {/* Mobile header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/40 shrink-0 md:hidden">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={buyerProfile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {buyerProfile?.display_name?.charAt(0) || "B"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{buyerProfile?.display_name || "Buyer"}</p>
                      <p className="text-xs text-muted-foreground">Buyer</p>
                    </div>
                  </div>
                  <p className="text-base font-bold text-primary">{format(myQuote.price)}</p>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-3">
                    {msgs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                        <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center mb-4">
                          <MessageSquare className="h-6 w-6 text-primary/60" />
                        </div>
                        <p className="font-medium text-foreground text-sm mb-1">Start the conversation</p>
                        <p className="text-xs">Introduce yourself and discuss the details with the buyer.</p>
                      </div>
                    ) : (
                      msgs.map((msg) => {
                        const isMe = msg.sender_id === userId;
                        return (
                          <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                            {!isMe && (
                              <Avatar className="h-7 w-7 border border-border shrink-0">
                                <AvatarImage src={buyerProfile?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                                  {buyerProfile?.display_name?.charAt(0) || "B"}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                              isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted/50 text-foreground rounded-bl-sm"
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Loading chat...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 sm:mb-6 animate-fade-in gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold text-foreground line-clamp-2 leading-snug">{job.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs border-primary/20 text-primary/80">{job.category}</Badge>
              </div>
            </div>
          </div>
          {isBuyer && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 h-9 px-2" onClick={handleCancelRequest}>
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Cancel</span>
            </Button>
          )}
        </div>

        {/* Live feed bar */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 backdrop-blur-sm px-3 sm:px-5 py-2.5 mb-4 sm:mb-6 animate-fade-in [animation-delay:100ms]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="text-sm font-semibold text-foreground">Live feed</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3 text-primary/60" /> {onlineCount}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-primary/60" /> {quotes.length}</span>
          </div>
        </div>

        {/* Offers leaderboard */}
        <div className="mb-6 sm:mb-8 animate-fade-in [animation-delay:200ms]">
          {quotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 py-12 flex flex-col items-center text-muted-foreground">
              <div className="relative mb-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center">
                  <Send className="h-6 w-6 text-primary/60" />
                </div>
                <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary animate-ping opacity-40" />
              </div>
              <p className="font-semibold text-foreground mb-1 text-sm">Waiting for expert offers...</p>
              <p className="text-xs">Offers usually arrive within 90 seconds</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[320px] rounded-xl">
              <div className="space-y-2 pr-1">
                {sortedQuotes.map((quote, i) => {
                  const isMyQuote = quote.expert_id === userId;
                  return (
                    <div
                      key={quote.id}
                      className={`flex items-center gap-2 sm:gap-4 rounded-xl border p-3 sm:p-4 transition-all duration-300 animate-slide-up ${
                        isMyQuote
                          ? "border-primary/40 bg-primary/[0.06] shadow-glow"
                          : isBuyer && selectedChatPartnerId === quote.expert_id
                          ? "border-primary/30 bg-primary/[0.04]"
                          : "border-border bg-card/60 hover:border-primary/20"
                      } ${isBuyer ? "cursor-pointer" : ""}`}
                      style={{ animationDelay: `${i * 80}ms` }}
                      onClick={() => isBuyer && setSelectedChatPartnerId(quote.expert_id)}
                    >
                      <div className="text-sm font-bold text-muted-foreground w-5 text-center shrink-0">{i + 1}</div>

                      <Avatar className="h-9 w-9 sm:h-11 sm:w-11 border border-border shrink-0">
                        <AvatarImage src={quote.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-xs">
                          {quote.profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground text-sm truncate">
                            {isMyQuote ? `${quote.profile?.display_name || "You"} (You)` : quote.profile?.display_name || "Expert"}
                          </span>
                          {quote.id === recommendedId && (
                            <Badge className="bg-primary/20 text-primary border-0 text-[10px] px-1.5">Best</Badge>
                          )}
                          {quote.id === fastestId && quote.id !== recommendedId && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">Fastest</Badge>
                          )}
                        </div>
                        {quote.profile?.rating_avg ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            {Math.round((quote.profile.rating_avg / 5) * 100)}%
                          </span>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-base sm:text-lg font-bold text-foreground">{format(quote.price)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDeliveryTime(quote.estimated_minutes)}</p>
                      </div>

                      {isBuyer && (
                        <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            className="gap-1 shadow-glow h-8 px-2.5 text-xs"
                            onClick={(e) => { e.stopPropagation(); handleAcceptQuote(quote); }}
                          >
                            <CreditCard className="h-3 w-3" />
                            <span className="hidden sm:inline">Pay</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground hover:text-primary hover:bg-primary/[0.06] h-8 px-2 text-xs"
                            onClick={(e) => { e.stopPropagation(); setSelectedChatPartnerId(quote.expert_id); }}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Live chat section */}
        {(isBuyer ? quotes.length > 0 : !!myQuote) && (
          <div className="animate-fade-in [animation-delay:300ms]">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {isBuyer ? "Live chat with sellers" : `Chat with ${buyerProfile?.display_name || "Buyer"}`}
            </h2>

            <div className={`grid grid-cols-1 ${isBuyer ? "md:grid-cols-3" : ""} gap-3 sm:gap-4`} style={{ height: "min(460px, 60vh)" }}>
              {/* Chat list — buyer only */}
              {isBuyer && (
                <div className="md:col-span-1 rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden hidden md:block">
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-1">
                      {sortedQuotes.map((quote) => {
                        const msgs = chatMessages[quote.expert_id] || [];
                        const lastMsg = msgs[msgs.length - 1];
                        return (
                          <button
                            key={quote.expert_id}
                            onClick={() => setSelectedChatPartnerId(quote.expert_id)}
                            className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                              selectedChatPartnerId === quote.expert_id ? "bg-primary/[0.08]" : "hover:bg-muted/30"
                            }`}
                          >
                            <Avatar className="h-9 w-9 shrink-0 border border-border">
                              <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-xs">
                                {quote.profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm text-foreground truncate">{quote.profile?.display_name || "Expert"}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {lastMsg ? lastMsg.content : format(quote.price)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* On mobile for buyer: seller selector as horizontal pill tabs */}
              {isBuyer && (
                <div className="md:hidden flex gap-2 overflow-x-auto pb-1 -mt-1 mb-1">
                  {sortedQuotes.map((q) => (
                    <button
                      key={q.expert_id}
                      onClick={() => setSelectedChatPartnerId(q.expert_id)}
                      className={`shrink-0 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedChatPartnerId === q.expert_id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">
                          {q.profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                        </AvatarFallback>
                      </Avatar>
                      {q.profile?.display_name?.split(" ")[0] || "Expert"} · {format(q.price)}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat window */}
              <div className={`${isBuyer ? "md:col-span-2" : ""} rounded-xl border border-border bg-card/60 backdrop-blur-sm flex flex-col overflow-hidden h-full`}>
                {selectedChatPartnerId && sessionMap[selectedChatPartnerId] ? (
                  <>
                    {/* Chat header */}
                    <div className="flex items-center justify-between border-b border-border px-3 sm:px-5 py-2.5 sm:py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-xs">
                            {chatPartnerName.split(" ").map(n => n[0]).join("").charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{chatPartnerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {isBuyer ? "Seller" : "Buyer"}
                          </p>
                        </div>
                      </div>
                      {isBuyer && selectedQuote && (
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">
                            {formatDeliveryTime(selectedQuote.estimated_minutes)}
                          </span>
                           <p className="text-lg font-bold text-primary">{format(selectedQuote.price)}</p>
                        </div>
                      )}
                      {!isBuyer && myQuote && (
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">Your offer</span>
                          <p className="text-lg font-bold text-primary">{format(myQuote.price)}</p>
                        </div>
                      )}
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4 min-h-0">
                      <div className="space-y-3">
                        {selectedMessages.map((msg) => {
                          const isMe = msg.sender_id === userId;
                          return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted/40 text-foreground rounded-bl-md"
                              }`}>
                                <p>{msg.content}</p>
                                <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Seller: new quote form */}
                    {!isBuyer && (
                      <div className="border-t border-border px-4 py-2">
                        {showQuoteForm ? (
                          <div className="space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-foreground">Send a new offer</p>
                              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.50"
                                  value={newQuotePrice}
                                  onChange={(e) => setNewQuotePrice(e.target.value)}
                                  placeholder="Price (€)"
                                  className="bg-background/60 border-border h-8 text-sm"
                                />
                              </div>
                              <div className="flex-1 flex gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={newQuoteMinutes}
                                  onChange={(e) => setNewQuoteMinutes(e.target.value)}
                                  placeholder="Delivery"
                                  className="bg-background/60 border-border h-8 text-sm w-16"
                                />
                                <div className="flex rounded-md border border-border overflow-hidden h-8">
                                  {(["minutes", "hours", "days"] as const).map((unit) => (
                                    <button
                                      key={unit}
                                      type="button"
                                      onClick={() => setNewQuoteUnit(unit)}
                                      className={`px-2 text-xs font-medium transition-colors ${
                                        newQuoteUnit === unit
                                          ? "bg-primary text-primary-foreground"
                                          : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"
                                      }`}
                                    >
                                      {unit === "minutes" ? "min" : unit === "hours" ? "hr" : "day"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <Button size="sm" className="h-8 gap-1.5" onClick={handleSubmitNewQuote} disabled={submittingQuote}>
                                {submittingQuote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                Send
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1.5 border-primary/20 text-primary hover:bg-primary/[0.06] text-xs h-7"
                            onClick={() => setShowQuoteForm(true)}
                          >
                            <RefreshCw className="h-3 w-3" /> Send a new offer
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Chat input */}
                    <div className="border-t border-border p-3">
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
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">
                      {selectedChatPartnerId && !sessionMap[selectedChatPartnerId]
                        ? "Loading chat..."
                        : isBuyer ? "Select a seller to start chatting" : "Chat will appear here"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PayPal Checkout Dialog — buyer only */}
        <Dialog open={!!paypalDialog} onOpenChange={() => { if (!paypalLoading) setPaypalDialog(null); }}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Secure Checkout
              </DialogTitle>
              <DialogDescription>
                Pay securely via PayPal. The seller will start working immediately after payment.
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
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-primary">€{(paypalDialog.price * 1.05).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/[0.04] rounded-lg p-3">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>You'll be redirected to PayPal to complete payment securely. Funds go directly to Duxio and are disbursed to the seller upon delivery confirmation.</span>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPaypalDialog(null)} disabled={paypalLoading} className="border-border">
                Cancel
              </Button>
              <Button onClick={handlePayPalCheckout} disabled={paypalLoading} className="gap-2 shadow-glow">
                {paypalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {paypalLoading ? "Waiting for PayPal..." : "Pay with PayPal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ActiveRequest;
