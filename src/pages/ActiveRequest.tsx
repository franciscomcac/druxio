import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Check, Clock, Send, MessageSquare, XCircle, Eye, Users, ThumbsUp,
  ArrowLeft, Zap, Loader2, CreditCard, ShieldCheck,
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
}

const ActiveRequest = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [quotes, setQuotes] = useState<QuoteWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Chat state
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [sessionMap, setSessionMap] = useState<Record<string, string>>({}); // expertId -> sessionId

  // Stats
  const [onlineCount, setOnlineCount] = useState(0);

  // PayPal checkout state
  const [paypalDialog, setPaypalDialog] = useState<QuoteWithProfile | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);

  // Load job + quotes
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

      if (!jobId) { navigate("/dashboard"); return; }

      const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (!jobData || jobData.buyer_id !== user.id) { navigate("/dashboard"); return; }
      setJob(jobData);

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
        // Sort by price ascending
        enriched.sort((a, b) => a.price - b.price);
        setQuotes(enriched);
        if (enriched.length > 0) setSelectedExpertId(enriched[0].expert_id);
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
          if (!selectedExpertId) setSelectedExpertId(q.expert_id);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, selectedExpertId]);

  // Load sessions linked to this job's quotes (expert → session mapping)
  useEffect(() => {
    if (!jobId || !userId || quotes.length === 0) return;

    const loadSessions = async () => {
      // Find sessions where the current user is mentee and the expert is mentor
      for (const quote of quotes) {
        const { data: sessionData } = await supabase
          .from("sessions")
          .select("id")
          .eq("mentee_id", userId)
          .eq("mentor_id", quote.expert_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionData) {
          setSessionMap((prev) => ({ ...prev, [quote.expert_id]: sessionData.id }));
        }
      }
    };
    loadSessions();
  }, [quotes, jobId, userId]);

  // Load real messages for the selected expert's session
  useEffect(() => {
    if (!selectedExpertId) return;
    const sid = sessionMap[selectedExpertId];
    if (!sid) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });
      if (data) {
        setChatMessages((prev) => ({ ...prev, [selectedExpertId]: data }));
      }
    };
    loadMessages();

    // Realtime subscription for this session's messages
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
          const existing = prev[selectedExpertId] || [];
          if (existing.find(m => m.id === newMsg.id)) return prev;
          return { ...prev, [selectedExpertId]: [...existing, newMsg] };
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedExpertId, sessionMap]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedExpertId]);

  const handleAcceptQuote = (quote: QuoteWithProfile) => {
    setPaypalDialog(quote);
  };

  const handlePaypalCheckout = async () => {
    if (!paypalDialog || !jobId) return;
    setPaypalLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Step 1: Create PayPal order via edge function
      const createRes = await supabase.functions.invoke("paypal-checkout", {
        body: { quoteId: paypalDialog.id, jobId },
      });

      if (createRes.error) throw new Error(createRes.error.message);
      const { orderId, approvalUrl } = createRes.data;

      if (!approvalUrl) throw new Error("No PayPal approval URL returned");

      // Step 2: Open PayPal approval in popup
      const popup = window.open(approvalUrl, "paypal-checkout", "width=500,height=700,scrollbars=yes");
      
      // Poll for popup close (user completed or cancelled PayPal flow)
      const pollInterval = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollInterval);
          
          // Step 3: Authorize the payment (escrow hold)
          try {
            const captureRes = await supabase.functions.invoke("paypal-capture", {
              body: { orderId, quoteId: paypalDialog.id, jobId },
            });

            if (captureRes.error) throw new Error(captureRes.error.message);

            toast({
              title: "Payment authorized! 🎉",
              description: `Funds held in escrow until ${paypalDialog.profile?.display_name || "the expert"} delivers.`,
            });
            setPaypalDialog(null);
            navigate("/dashboard");
          } catch (captureErr: any) {
            toast({
              title: "Payment not completed",
              description: "PayPal checkout was cancelled or failed. No charges were made.",
              variant: "destructive",
            });
          }
          setPaypalLoading(false);
        }
      }, 500);
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
    if (!chatInput.trim() || !selectedExpertId || !userId) return;
    const sid = sessionMap[selectedExpertId];
    if (!sid) return;

    setSendingChat(true);
    const { error } = await supabase.from("messages").insert({
      session_id: sid,
      sender_id: userId,
      content: chatInput.trim(),
    });

    if (error) {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    } else {
      setChatInput("");
    }
    setSendingChat(false);
  };

  const selectedQuote = quotes.find(q => q.expert_id === selectedExpertId);
  const selectedMessages = selectedExpertId ? (chatMessages[selectedExpertId] || []) : [];
  const unreadCounts: Record<string, number> = {}; // Placeholder for unread logic

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDeliveryTime = (minutes: number) => {
    if (minutes >= 1440) {
      const days = Math.round(minutes / 1440);
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    if (minutes >= 60) {
      const hours = Math.round(minutes / 60);
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
    return `${minutes} min`;
  };

  if (!job) return null;

  const sortedQuotes = [...quotes].sort((a, b) => a.price - b.price);
  const cheapestId = sortedQuotes.length > 0 ? sortedQuotes[0].id : null;
  const fastestId = sortedQuotes.length > 0
    ? sortedQuotes.reduce((prev, curr) => curr.estimated_minutes < prev.estimated_minutes ? curr : prev).id
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="hover:bg-primary/[0.06]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <Badge variant="outline" className="border-primary/20 text-primary/80">{job.category}</Badge>
                {job.description && <span className="truncate max-w-xs">{job.description}</span>}
              </div>
            </div>
          </div>
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleCancelRequest}>
            <XCircle className="h-4 w-4" /> Cancel request
          </Button>
        </div>

        {/* Live feed bar */}
        <div className="flex items-center justify-between rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm px-5 py-3 mb-6 animate-fade-in [animation-delay:100ms]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <span className="text-sm font-semibold text-foreground">Offers live feed</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary/60" /> Notified sellers: {onlineCount}</span>
            <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-primary/60" /> Offers: {quotes.length}</span>
          </div>
        </div>

        {/* Offers leaderboard */}
        <div className="mb-8 animate-fade-in [animation-delay:200ms]">
          {quotes.length === 0 ? (
            <Card className="border-dashed border-border/30 bg-card/30">
              <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
                <div className="relative mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-primary/[0.08] flex items-center justify-center">
                    <Send className="h-7 w-7 text-primary/60" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary animate-ping opacity-40" />
                </div>
                <p className="font-semibold text-foreground mb-1">Waiting for expert offers...</p>
                <p className="text-sm">Offers usually arrive within 90 seconds</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sortedQuotes.map((quote, i) => (
                <div
                  key={quote.id}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-300 animate-slide-up cursor-pointer ${
                    selectedExpertId === quote.expert_id
                      ? "border-primary/30 bg-primary/[0.04] shadow-glow"
                      : "border-border/30 bg-card/60 hover:border-primary/20"
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                  onClick={() => setSelectedExpertId(quote.expert_id)}
                >
                  {/* Avatar */}
                  <Avatar className="h-11 w-11 border border-border/30 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-sm">
                      {quote.profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Seller info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{quote.profile?.display_name || "Expert"}</span>
                      {quote.profile?.rating_avg ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ThumbsUp className="h-3 w-3 text-primary/60" />
                          {((quote.profile.rating_avg / 5) * 100).toFixed(0)}%
                        </span>
                      ) : null}
                      {quote.profile?.total_sessions ? (
                        <span className="text-xs text-muted-foreground">{quote.profile.total_sessions} reviews</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {quote.id === cheapestId && i === 0 && (
                      <Badge className="bg-primary/20 text-primary border-0 text-xs">Recommended</Badge>
                    )}
                    {quote.id === fastestId && quote.id !== cheapestId && (
                      <Badge variant="secondary" className="text-xs">Fastest</Badge>
                    )}
                  </div>

                  {/* Delivery time */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-muted-foreground">Delivery time</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatDeliveryTime(quote.estimated_minutes)}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="shrink-0 min-w-[70px] text-right">
                    <p className="text-lg font-bold text-foreground">€{quote.price.toFixed(2)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/[0.06]"
                      onClick={(e) => { e.stopPropagation(); setSelectedExpertId(quote.expert_id); }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Chat
                    </Button>
                     <Button
                       size="sm"
                       className="gap-1.5 shadow-glow hover:shadow-glow-lg transition-shadow"
                       onClick={(e) => { e.stopPropagation(); handleAcceptQuote(quote); }}
                     >
                       <CreditCard className="h-3.5 w-3.5" /> Pay & Accept
                     </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live chat section */}
        {quotes.length > 0 && (
          <div className="animate-fade-in [animation-delay:300ms]">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Live chat with sellers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: 400 }}>
              {/* Chat list */}
              <div className="md:col-span-1 rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <div className="p-2 space-y-1">
                    {sortedQuotes.map((quote) => {
                      const msgs = chatMessages[quote.expert_id] || [];
                      const lastMsg = msgs[msgs.length - 1];
                      return (
                        <button
                          key={quote.expert_id}
                          onClick={() => setSelectedExpertId(quote.expert_id)}
                          className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                            selectedExpertId === quote.expert_id
                              ? "bg-primary/[0.08]"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <Avatar className="h-10 w-10 shrink-0 border border-border/30">
                            <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-xs">
                              {quote.profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-foreground truncate">{quote.profile?.display_name || "Expert"}</span>
                              {lastMsg && (
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {lastMsg ? lastMsg.content : `€${quote.price.toFixed(2)} · ${quote.estimated_minutes} min`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Chat window */}
              <div className="md:col-span-2 rounded-xl border border-border/30 bg-card/60 backdrop-blur-sm flex flex-col overflow-hidden">
                {selectedExpertId && selectedQuote ? (
                  <>
                    {/* Chat header */}
                    <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/30">
                          <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-xs">
                            {selectedQuote.profile?.display_name?.split(" ").map(n => n[0]).join("") || "E"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{selectedQuote.profile?.display_name || "Expert"}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {selectedQuote.profile?.rating_avg ? (
                              <span className="flex items-center gap-0.5">
                                <ThumbsUp className="h-3 w-3 text-primary/60" />
                                {((selectedQuote.profile.rating_avg / 5) * 100).toFixed(0)}%
                              </span>
                            ) : null}
                            {selectedQuote.profile?.total_sessions ? (
                              <span>{selectedQuote.profile.total_sessions} reviews</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {formatDeliveryTime(selectedQuote.estimated_minutes)}
                        </span>
                        <p className="text-lg font-bold text-primary">€{selectedQuote.price.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4" style={{ minHeight: 250 }}>
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

                    {/* Chat input */}
                    <div className="border-t border-border/30 p-3">
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
                    <p className="text-sm">Select a seller to start chatting</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* PayPal Checkout Dialog */}
        <Dialog open={!!paypalDialog} onOpenChange={() => { if (!paypalLoading) setPaypalDialog(null); }}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Secure Checkout
              </DialogTitle>
              <DialogDescription>
                Pay via PayPal. Funds are held in escrow until the service is delivered.
              </DialogDescription>
            </DialogHeader>
            {paypalDialog && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/30 bg-background/40 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service price</span>
                    <span className="font-medium text-foreground">€{paypalDialog.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Buyer fee (5%)</span>
                    <span className="font-medium text-foreground">€{(paypalDialog.price * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/30 pt-2 flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-primary">€{(paypalDialog.price * 1.05).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/[0.04] rounded-lg p-3">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Your payment is held securely in escrow. Funds are only released to the seller once you confirm delivery.</span>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPaypalDialog(null)} disabled={paypalLoading} className="border-border/30">
                Cancel
              </Button>
              <Button onClick={handlePaypalCheckout} disabled={paypalLoading} className="gap-2 shadow-glow">
                {paypalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {paypalLoading ? "Processing..." : "Pay with PayPal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ActiveRequest;
