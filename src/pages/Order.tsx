import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Clock, MessageSquare, Send, Loader2, ShieldCheck,
  AlertTriangle, CheckCircle2, Timer, Star, RefreshCw,
  FileText, Handshake, CreditCard, Package, ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow, differenceInSeconds, addMinutes } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

const Order = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [buyerProfile, setBuyerProfile] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Countdown
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Dispute dialog
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);

  // Review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Confirm delivery dialog (buyer accepts)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Seller actions
  const [agreeLoading, setAgreeLoading] = useState(false);
  const [shipLoading, setShipLoading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      if (!jobId) { navigate("/dashboard"); return; }

      const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (!jobData) { navigate("/dashboard"); return; }
      setJob(jobData);

      const { data: quoteData } = await supabase
        .from("quotes").select("*").eq("job_id", jobId).eq("status", "accepted").maybeSingle();
      if (!quoteData) { setLoading(false); return; }
      setQuote(quoteData);

      // Get seller profile
      const { data: sp } = await supabase
        .from("profiles").select("display_name, avatar_url, rating_avg, total_sessions, is_online")
        .eq("id", quoteData.expert_id).single();
      setSellerProfile(sp);

      // Get buyer profile
      const { data: bp } = await supabase
        .from("profiles").select("display_name, avatar_url")
        .eq("id", jobData.buyer_id).single();
      setBuyerProfile(bp);

      // Get session
      const isBuyer = user.id === jobData.buyer_id;
      const { data: sessionData } = await supabase
        .from("sessions").select("id")
        .eq("mentee_id", jobData.buyer_id)
        .eq("mentor_id", quoteData.expert_id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (sessionData) {
        setSessionId(sessionData.id);
        const { data: existingReview } = await supabase
          .from("reviews").select("id").eq("session_id", sessionData.id)
          .eq("reviewer_id", user.id).maybeSingle();
        if (existingReview) setHasReviewed(true);
      }

      setLoading(false);
    };
    load();
  }, [jobId, navigate]);

  // Load messages & realtime
  useEffect(() => {
    if (!sessionId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages").select("id, content, sender_id, created_at")
        .eq("session_id", sessionId).order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    loadMessages();

    const channel = supabase
      .channel(`order-chat-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  // Delivery countdown
  useEffect(() => {
    if (!quote || !job) return;
    const acceptedAt = new Date(quote.created_at);
    const deadline = addMinutes(acceptedAt, quote.estimated_minutes);
    const tick = () => {
      const remaining = differenceInSeconds(deadline, new Date());
      setTimeLeft(Math.max(0, remaining));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [quote, job]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || !sessionId || !userId) return;
    setSendingChat(true);
    const { error } = await supabase.from("messages").insert({
      session_id: sessionId, sender_id: userId, content: chatInput.trim(),
    });
    if (error) toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    else setChatInput("");
    setSendingChat(false);
  };

  // Seller agrees to escrow transaction (redirect to Escrow.com)
  const handleSellerAgree = () => {
    if (!job?.escrow_txn_id) return;
    window.open(`https://www.escrow.com/transactions/${job.escrow_txn_id}`, "_blank");
    toast({ title: "Opening Escrow.com", description: "Please agree to the transaction on the Escrow.com page, then come back." });
  };

  // Seller marks as delivered (redirect to Escrow.com)
  const handleSellerDeliver = () => {
    if (!job?.escrow_txn_id) return;
    window.open(`https://www.escrow.com/transactions/${job.escrow_txn_id}`, "_blank");
    toast({ title: "Opening Escrow.com", description: "Please mark the item as shipped on the Escrow.com page." });
  };

  // Refresh escrow status from Escrow.com
  const handleRefreshStatus = async () => {
    if (!jobId) return;
    setRefreshingStatus(true);
    try {
      const res = await supabase.functions.invoke("escrow-status", { body: { jobId } });
      if (res.error) throw new Error(res.error.message);
      const data = res.data as any;
      if (data.escrow_status) {
        setJob((prev: any) => prev ? { ...prev, escrow_status: data.escrow_status } : prev);
        toast({ title: "Status updated", description: `Escrow status: ${data.escrow_status}` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setRefreshingStatus(false);
  };

  // Buyer confirms delivery (accept)
  const handleConfirmDelivery = async () => {
    if (!jobId || !quote) return;
    setConfirmLoading(true);
    try {
      const res = await supabase.functions.invoke("escrow-release", { body: { jobId, quoteId: quote.id } });
      if (res.error) throw new Error(res.error.message);

      if (sessionId) {
        await supabase.from("sessions").update({ status: "completed" }).eq("id", sessionId);
      }

      toast({ title: "Delivery confirmed! 🎉", description: "Payment released to the seller." });
      setConfirmOpen(false);
      setJob((prev: any) => prev ? { ...prev, status: "completed", escrow_status: "completed" } : prev);
      setReviewOpen(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setConfirmLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewRating || !sessionId || !quote || !userId) return;
    setReviewLoading(true);
    try {
      await supabase.from("reviews").insert({
        session_id: sessionId, reviewer_id: userId, reviewee_id: quote.expert_id,
        rating: reviewRating, comment: reviewComment.trim() || null,
      });
      toast({ title: "Review submitted! ⭐" });
      setReviewOpen(false);
      setHasReviewed(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setReviewLoading(false);
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim() || !jobId) return;
    setDisputeLoading(true);
    try {
      await supabase.from("notifications").insert({
        user_id: userId!, type: "dispute", title: "Dispute raised",
        message: disputeReason.trim(), data: { job_id: jobId, quote_id: quote?.id },
      });
      await supabase.from("jobs").update({ status: "disputed" }).eq("id", jobId);
      toast({ title: "Dispute raised", description: "Our team will review your case shortly." });
      setDisputeOpen(false);
      setJob((prev: any) => prev ? { ...prev, status: "disputed" } : prev);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDisputeLoading(false);
  };

  const formatCountdown = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const formatDeliveryTime = (minutes: number) => {
    if (minutes >= 1440) return `${Math.round(minutes / 1440)} day${Math.round(minutes / 1440) !== 1 ? "s" : ""}`;
    if (minutes >= 60) return `${Math.round(minutes / 60)} hour${Math.round(minutes / 60) !== 1 ? "s" : ""}`;
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job || !quote) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Order not found or not yet accepted.</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </main>
      </div>
    );
  }

  const isCompleted = job.status === "completed";
  const isDisputed = job.status === "disputed";
  const isOverdue = timeLeft === 0 && !isCompleted;
  const isBuyer = userId === job.buyer_id;
  const isSeller = userId === quote.expert_id;
  const escrowStatus = job.escrow_status || "awaiting_agreement";
  const otherPartyProfile = isBuyer ? sellerProfile : buyerProfile;
  const otherPartyLabel = isBuyer ? "Seller" : "Buyer";

  const getEscrowStatusInfo = () => {
    switch (escrowStatus) {
      case "awaiting_agreement":
        return { label: "Awaiting Seller Agreement", color: "text-yellow-500", bg: "bg-yellow-500/10" };
      case "awaiting_funding":
        return { label: "Awaiting Buyer Payment", color: "text-orange-500", bg: "bg-orange-500/10" };
      case "funded":
        return { label: "Funded - In Progress", color: "text-blue-500", bg: "bg-blue-500/10" };
      case "delivered":
        return { label: "Delivered - Awaiting Acceptance", color: "text-purple-500", bg: "bg-purple-500/10" };
      case "completed":
        return { label: "Completed", color: "text-green-500", bg: "bg-green-500/10" };
      default:
        return { label: escrowStatus, color: "text-muted-foreground", bg: "bg-muted/10" };
    }
  };

  const escrowInfo = getEscrowStatusInfo();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Back button & title */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(isBuyer ? "/orders/purchased" : "/orders/sold")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{job.category}</Badge>
              <Badge variant={isCompleted ? "default" : isDisputed ? "destructive" : "secondary"}>
                {isCompleted ? "Completed" : isDisputed ? "Disputed" : "In Progress"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Order details + Actions */}
          <div className="lg:col-span-1 space-y-4">
            {/* Escrow Status */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${escrowInfo.bg}`}>
                    <ShieldCheck className={`h-5 w-5 ${escrowInfo.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Escrow Status</p>
                    <p className={`text-sm font-semibold ${escrowInfo.color}`}>{escrowInfo.label}</p>
                  </div>
                </div>
                {job.escrow_txn_id && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Transaction #{job.escrow_txn_id}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={handleRefreshStatus}
                  disabled={refreshingStatus}
                >
                  {refreshingStatus ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Refresh Status
                </Button>
              </CardContent>
            </Card>

            {/* Delivery countdown */}
            {!isCompleted && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      isOverdue ? "bg-destructive/10" : "bg-primary/10"
                    }`}>
                      {isOverdue ? <AlertTriangle className="h-5 w-5 text-destructive" /> :
                       <Timer className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {isOverdue ? "Overdue" : "Delivery Countdown"}
                      </p>
                      {timeLeft !== null && (
                        <p className={`text-xl font-bold ${isOverdue ? "text-destructive" : "text-primary"}`}>
                          {isOverdue ? "Overdue" : formatCountdown(timeLeft)}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Guaranteed delivery: {formatDeliveryTime(quote.estimated_minutes)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Order summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.description && (
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service price</span>
                    <span className="font-medium text-foreground">€{Number(quote.price).toFixed(2)}</span>
                  </div>
                  {isBuyer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buyer fee (5%)</span>
                      <span className="font-medium text-foreground">€{(quote.price * 0.05).toFixed(2)}</span>
                    </div>
                  )}
                  {isSeller && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform fee (5%)</span>
                      <span className="font-medium text-foreground">-€{(quote.price * 0.05).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold text-foreground">
                      {isBuyer ? "Total paid" : "You'll earn"}
                    </span>
                    <span className="font-bold text-primary">
                      €{isBuyer ? (quote.price * 1.05).toFixed(2) : (quote.price * 0.95).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other party info */}
            <Card className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate(isBuyer ? `/mentor/${quote.expert_id}` : `/mentor/${job.buyer_id}`)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border/30">
                    <AvatarImage src={otherPartyProfile?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {otherPartyProfile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{otherPartyProfile?.display_name || otherPartyLabel}</p>
                    <p className="text-xs text-muted-foreground">{otherPartyLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Actions */}
            {isSeller && !isCompleted && !isDisputed && (
              <div className="space-y-2">
                {escrowStatus === "awaiting_agreement" && (
                  <Button className="w-full gap-2" onClick={handleSellerAgree} disabled={agreeLoading}>
                    {agreeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
                    {agreeLoading ? "Agreeing..." : "Agree to Transaction"}
                  </Button>
                )}
                {(escrowStatus === "funded" || escrowStatus === "awaiting_funding") && (
                  <Button className="w-full gap-2" onClick={handleSellerDeliver} disabled={shipLoading || escrowStatus === "awaiting_funding"}>
                    {shipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                    {shipLoading ? "Processing..." : escrowStatus === "awaiting_funding" ? "Waiting for buyer payment..." : "Mark as Delivered"}
                  </Button>
                )}
                {escrowStatus === "delivered" && (
                  <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2 p-3">
                    <Clock className="h-4 w-4" /> Waiting for buyer to confirm delivery
                  </div>
                )}
              </div>
            )}

            {/* Buyer Actions */}
            {isBuyer && !isCompleted && !isDisputed && (
              <div className="space-y-2">
                {escrowStatus === "awaiting_agreement" && (
                  <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2 p-3">
                    <Clock className="h-4 w-4" /> Waiting for seller to agree
                  </div>
                )}
                {escrowStatus === "awaiting_funding" && job.escrow_txn_id && (
                  <Button className="w-full gap-2" asChild>
                    <a href={`https://www.escrow.com/transactions/${job.escrow_txn_id}/payment`} target="_blank" rel="noopener noreferrer">
                      <CreditCard className="h-4 w-4" /> Fund Escrow Payment
                    </a>
                  </Button>
                )}
                {escrowStatus === "delivered" && (
                  <Button className="w-full gap-2" onClick={() => setConfirmOpen(true)}>
                    <CheckCircle2 className="h-4 w-4" /> Confirm Delivery & Release Payment
                  </Button>
                )}
                {(escrowStatus === "funded") && (
                  <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2 p-3">
                    <Clock className="h-4 w-4" /> Seller is working on your order
                  </div>
                )}
                <Button variant="outline" className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDisputeOpen(true)}>
                  <AlertTriangle className="h-4 w-4" /> Raise Dispute
                </Button>
              </div>
            )}

            {/* Post-completion actions */}
            {isBuyer && isCompleted && !hasReviewed && (
              <Button className="w-full gap-2" onClick={() => setReviewOpen(true)}>
                <Star className="h-4 w-4" /> Leave a Review
              </Button>
            )}
            {isBuyer && isCompleted && hasReviewed && (
              <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Review submitted
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-2">
            <Card className="flex flex-col" style={{ height: 600 }}>
              <CardHeader className="pb-3 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Chat with {otherPartyProfile?.display_name || otherPartyLabel}</CardTitle>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted/40 text-foreground rounded-bl-md"
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
                  {isDisputed && (
                    <div className="flex justify-center my-4">
                      <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-destructive/10 border border-destructive/20 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <ShieldCheck className="h-4 w-4 text-destructive" />
                          <span className="font-semibold text-destructive">Admin Notice</span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          A dispute has been raised. Our admin team will review the case.
                        </p>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="border-t border-border/30 p-3 shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sendingChat}
                  />
                  <Button type="submit" size="icon" disabled={!chatInput.trim() || sendingChat}>
                    {sendingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      {/* Confirm Delivery Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Confirm Delivery
            </DialogTitle>
            <DialogDescription>
              Once you confirm, the escrowed payment will be released to the seller. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={confirmLoading}>Cancel</Button>
            <Button onClick={handleConfirmDelivery} disabled={confirmLoading} className="gap-2">
              {confirmLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {confirmLoading ? "Processing..." : "Confirm & Release Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Raise a Dispute
            </DialogTitle>
            <DialogDescription>
              Describe the issue with this order. Our team will review and mediate.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Describe the problem..." rows={4} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisputeOpen(false)} disabled={disputeLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleRaiseDispute} disabled={disputeLoading || !disputeReason.trim()} className="gap-2">
              {disputeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {disputeLoading ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> Rate your experience
            </DialogTitle>
            <DialogDescription>
              How was your experience with {sellerProfile?.display_name || "the seller"}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setReviewHover(star)} onMouseLeave={() => setReviewHover(0)}
                  onClick={() => setReviewRating(star)}>
                  <Star className={`h-8 w-8 ${star <= (reviewHover || reviewRating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {reviewRating === 1 ? "Poor" : reviewRating === 2 ? "Below Average" : reviewRating === 3 ? "Average" : reviewRating === 4 ? "Good" : reviewRating === 5 ? "Excellent" : "Select a rating"}
            </p>
            <div className="flex flex-wrap gap-2">
              {["Great service", "Fast delivery", "Very helpful", "Highly skilled"].map((tag) => (
                <button key={tag} type="button"
                  onClick={() => setReviewComment((prev) => prev.includes(tag) ? prev.replace(tag, "").replace(/\s{2,}/g, " ").trim() : (prev ? `${prev}, ${tag}` : tag))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    reviewComment.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "bg-accent/40 text-muted-foreground border-border/40 hover:bg-accent"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
            <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Tell us about your experience (optional)..." rows={3} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={reviewLoading}>Skip</Button>
            <Button onClick={handleSubmitReview} disabled={reviewLoading || !reviewRating} className="gap-2">
              {reviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              {reviewLoading ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Order;
