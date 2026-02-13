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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Clock, MessageSquare, Send, Loader2, ShieldCheck,
  AlertTriangle, CheckCircle2, Package, Timer, ThumbsUp, Star,
  FileText,
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

  // Confirm delivery dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

      if (!jobId) { navigate("/dashboard"); return; }

      // Get job
      const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (!jobData) { navigate("/dashboard"); return; }
      setJob(jobData);

      // Get accepted quote
      const { data: quoteData } = await supabase
        .from("quotes")
        .select("*")
        .eq("job_id", jobId)
        .eq("status", "accepted")
        .maybeSingle();

      if (!quoteData) {
        // No accepted quote — maybe still open
        setLoading(false);
        return;
      }
      setQuote(quoteData);

      // Get seller profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, rating_avg, total_sessions, is_online")
        .eq("id", quoteData.expert_id)
        .single();
      setSellerProfile(profile);

      // Get session (chat channel between buyer and this seller)
      const { data: sessionData } = await supabase
        .from("sessions")
        .select("id")
        .eq("mentee_id", user.id)
        .eq("mentor_id", quoteData.expert_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setSessionId(sessionData.id);
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
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    loadMessages();

    const channel = supabase
      .channel(`order-chat-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages((prev) => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Scroll chat — only scroll inside the chat scroll area, not the whole page
  useEffect(() => {
    const container = chatScrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Delivery countdown
  useEffect(() => {
    if (!quote || !job) return;
    // Deadline = quote accepted time + estimated_minutes
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
      session_id: sessionId,
      sender_id: userId,
      content: chatInput.trim(),
    });
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } else {
      setChatInput("");
    }
    setSendingChat(false);
  };

  const handleConfirmDelivery = async () => {
    if (!jobId || !quote) return;
    setConfirmLoading(true);
    try {
      // Call paypal-release to capture escrowed funds
      const res = await supabase.functions.invoke("paypal-release", {
        body: { jobId, quoteId: quote.id },
      });
      if (res.error) throw new Error(res.error.message);

      // Update job status
      await supabase.from("jobs").update({ status: "completed" }).eq("id", jobId);
      // Update session to completed
      if (sessionId) {
        await supabase.from("sessions").update({ status: "completed" }).eq("id", sessionId);
      }

      toast({ title: "Delivery confirmed! 🎉", description: "Payment released to the seller." });
      setConfirmOpen(false);
      setJob((prev: any) => prev ? { ...prev, status: "completed" } : prev);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setConfirmLoading(false);
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim() || !jobId) return;
    setDisputeLoading(true);
    try {
      // Create a notification for admins / record the dispute
      await supabase.from("notifications").insert({
        user_id: userId!,
        type: "dispute",
        title: "Dispute raised",
        message: disputeReason.trim(),
        data: { job_id: jobId, quote_id: quote?.id },
      });

      // Update job status
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Back button & title */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inbox")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
            <div className="flex items-center gap-2 mt-1">
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
            {/* Delivery countdown */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    isCompleted ? "bg-green-500/10" : isOverdue ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                     isOverdue ? <AlertTriangle className="h-5 w-5 text-destructive" /> :
                     <Timer className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isCompleted ? "Delivered" : isOverdue ? "Overdue" : "Delivery Countdown"}
                    </p>
                    {!isCompleted && timeLeft !== null && (
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
                    <span className="font-medium text-foreground">€{quote.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buyer fee (5%)</span>
                    <span className="font-medium text-foreground">€{(quote.price * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="font-semibold text-foreground">Total paid</span>
                    <span className="font-bold text-primary">€{(quote.price * 1.05).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller info */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border/30">
                    <AvatarImage src={sellerProfile?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {sellerProfile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{sellerProfile?.display_name || "Seller"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {sellerProfile?.rating_avg ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-primary" />
                          {sellerProfile.rating_avg.toFixed(1)}
                        </span>
                      ) : null}
                      {sellerProfile?.total_sessions ? (
                        <span>{sellerProfile.total_sessions} sessions</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {isBuyer && !isCompleted && !isDisputed && (
              <div className="space-y-2">
                <Button className="w-full gap-2" onClick={() => setConfirmOpen(true)}>
                  <CheckCircle2 className="h-4 w-4" /> Confirm Delivery
                </Button>
                <Button variant="outline" className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDisputeOpen(true)}>
                  <AlertTriangle className="h-4 w-4" /> Raise Dispute
                </Button>
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-2">
            <Card className="flex flex-col" style={{ height: 600 }}>
              <CardHeader className="pb-3 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Chat with {sellerProfile?.display_name || "Seller"}</CardTitle>
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
                          A dispute has been raised for this order. Our admin team will review the case and take appropriate action. Please wait for a resolution.
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
          <Textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Describe the problem..."
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisputeOpen(false)} disabled={disputeLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleRaiseDispute} disabled={disputeLoading || !disputeReason.trim()} className="gap-2">
              {disputeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {disputeLoading ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Order;
