import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail, buildOrderDeliveredEmail, buildPaymentReleasedEmail, buildOrderCancelledEmail, buildDisputeAdminEmail } from "@/lib/send-email";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useModeration } from "@/hooks/use-moderation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Clock, MessageSquare, Send, Loader2, ShieldCheck,
  AlertTriangle, CheckCircle2, Timer, Star,
  FileText, Package, CreditCard, XCircle, Undo2,
  Paperclip, X, Image as ImageIcon, Video, ExternalLink, Hourglass,
} from "lucide-react";
import { formatDistanceToNow, differenceInSeconds, addMinutes, addDays, isPast } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  image_urls: string[] | null;
}

const Order = () => {
  useSEO({ title: "Order", noIndex: true });
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath: string | undefined = (location.state as any)?.from;
  const { toast } = useToast();
  const { format } = useCurrency();
  const { softCheckContent } = useModeration();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  // Video call dialog
  const [meetDialogOpen, setMeetDialogOpen] = useState(false);
  const [meetLink, setMeetLink] = useState("");
  const [sendingMeet, setSendingMeet] = useState(false);

  // Confirm delivery dialog (buyer accepts)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Seller deliver confirmation dialog
  const [deliverConfirmOpen, setDeliverConfirmOpen] = useState(false);
  const [deliveringOrder, setDeliveringOrder] = useState(false);

  // Cancel delivery dialog (seller cancels)
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Auto-release countdown (3 days from delivered_at)
  const [autoReleaseSecondsLeft, setAutoReleaseSecondsLeft] = useState<number | null>(null);

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

      const { data: sp } = await supabase
        .from("profiles").select("display_name, avatar_url, rating_avg, total_sessions, is_online")
        .eq("id", quoteData.expert_id).single();
      setSellerProfile(sp);

      const { data: bp } = await supabase
        .from("profiles").select("display_name, avatar_url")
        .eq("id", jobData.buyer_id).single();
      setBuyerProfile(bp);

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

  // Realtime: update job/quote status without refresh
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`order-status-${jobId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` }, (payload) => {
        setJob((prev: any) => prev ? { ...prev, ...payload.new } : payload.new);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes" }, (payload) => {
        const updated = payload.new as any;
        if (updated.job_id === jobId) setQuote((prev: any) => prev ? { ...prev, ...updated } : updated);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  // Load messages & realtime
  useEffect(() => {
    if (!sessionId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages").select("id, content, sender_id, created_at, image_urls")
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

  // Scroll only the chat panel to the bottom — never the whole page
  const scrollChatToBottom = () => {
    const viewport = chatScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  };

  useEffect(() => {
    if (messages.length === 0) return;
    // rAF ensures the DOM has painted before we measure scrollHeight
    requestAnimationFrame(() => {
      scrollChatToBottom();
      // Secondary timeout covers slow renders / images loading
      setTimeout(scrollChatToBottom, 80);
    });
  }, [messages]);

  useEffect(() => {
    if (!quote || !job) return;
    // Stop timer once the order is delivered, completed, or disputed
    if (job.escrow_status === "delivered" || job.escrow_status === "completed" || job.status === "completed" || job.status === "disputed" || job.status === "cancelled") {
      setTimeLeft(null);
      return;
    }
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

  // Auto-release countdown: 3 days from delivered_at
  useEffect(() => {
    if (!job?.delivered_at || job.escrow_status !== "delivered") return;
    const autoReleaseAt = addDays(new Date(job.delivered_at), 3);
    const tick = () => {
      const remaining = differenceInSeconds(autoReleaseAt, new Date());
      setAutoReleaseSecondsLeft(Math.max(0, remaining));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [job?.delivered_at, job?.escrow_status]);

  // Image handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const previews = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPendingImages((prev) => [...prev, ...previews].slice(0, 4));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!userId || pendingImages.length === 0) return [];
    const urls: string[] = [];
    for (const { file } of pendingImages) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() && pendingImages.length === 0) return;
    if (!sessionId || !userId) return;
    setSendingChat(true);
    const messageText = chatInput.trim();

    try {
      let imageUrls: string[] = [];
      if (pendingImages.length > 0) {
        setUploadingImages(true);
        imageUrls = await uploadImages();
        pendingImages.forEach((p) => URL.revokeObjectURL(p.preview));
        setPendingImages([]);
        setUploadingImages(false);
      }

      const { error } = await supabase.from("messages").insert({
        session_id: sessionId, sender_id: userId,
        content: messageText || (imageUrls.length > 0 ? "📷 Image" : ""),
        image_urls: imageUrls.length > 0 ? imageUrls : null,
      });
      if (error) throw error;
      setChatInput("");
      if (messageText) {
        softCheckContent(messageText, "order chat message", { job_id: jobId, sender_id: userId });
      }
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    }
    setSendingChat(false);
  };

  const handleSendMeetLink = async () => {
    if (!meetLink.trim() || !sessionId || !userId) return;
    setSendingMeet(true);
    try {
      const url = meetLink.trim();
      const { error } = await supabase.from("messages").insert({
        session_id: sessionId,
        sender_id: userId,
        content: `📹 Video Call: ${url}`,
      });
      if (error) throw error;
      setMeetLink("");
      setMeetDialogOpen(false);
      toast({ title: "Video call link sent! 📹", description: "The other party can now join your meeting." });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    }
    setSendingMeet(false);
  };

  // Helper: fire-and-forget order email via edge function
  const sendOrderEmail = (event: string, extra?: Record<string, unknown>) => {
    supabase.functions.invoke("send-order-email", { body: { event, jobId, ...extra } }).catch(console.error);
  };

  // Seller marks as delivered
  const handleSellerDeliver = async () => {
    if (!jobId) return;
    setDeliveringOrder(true);
    const now = new Date().toISOString();
    await supabase.from("jobs").update({ escrow_status: "delivered", status: "in_progress", delivered_at: now }).eq("id", jobId);
    setJob((prev: any) => prev ? { ...prev, escrow_status: "delivered", status: "in_progress", delivered_at: now } : prev);

    // Send a system message in the chat
    if (sessionId && userId) {
      await supabase.from("messages").insert({
        session_id: sessionId,
        sender_id: userId,
        content: "📦 DELIVERED: The seller has marked this order as delivered. Please review the work and confirm delivery to release payment, or raise a dispute if there is an issue. Payment will be automatically released in 3 days if no action is taken.",
      });
    }

    // Notify buyer
    if (job?.buyer_id) {
      await supabase.from("notifications").insert({
        user_id: job.buyer_id, type: "order_completed",
        title: "Order delivered! 📦", message: "The seller has marked your order as delivered. Please confirm within 3 days or payment will be auto-released.",
        data: { job_id: jobId },
      });
    }

    // Email buyer
    sendOrderEmail("order_delivered");

    setDeliverConfirmOpen(false);
    setDeliveringOrder(false);
    toast({ title: "Marked as delivered! 📦", description: "The buyer has 3 days to confirm. Payment auto-releases if they don't act." });
  };

  // Buyer confirms delivery
  const handleConfirmDelivery = async () => {
    if (!jobId || !quote) return;
    setConfirmLoading(true);
    try {
      // Credit seller wallet
      const servicePrice = Number(quote.price);
      const sellerEarning = Math.round(servicePrice * 0.95 * 100) / 100;

      // Update seller balance
      const { data: sellerData } = await supabase
        .from("profiles").select("wallet_balance").eq("id", quote.expert_id).single();
      const currentBalance = Number(sellerData?.wallet_balance || 0);
      await supabase.from("profiles").update({
        wallet_balance: currentBalance + sellerEarning,
      }).eq("id", quote.expert_id);

      // Record seller earning transaction
      await supabase.from("transactions").insert({
        user_id: quote.expert_id,
        amount: sellerEarning,
        type: "session_earning",
        status: "completed",
        description: `Earning for job ${jobId}`,
      });

      // Mark job completed
      await supabase.from("jobs").update({ status: "completed", escrow_status: "completed" }).eq("id", jobId);

      if (sessionId) {
        await supabase.from("sessions").update({ status: "completed" }).eq("id", sessionId);
      }

      // Notify seller
      await supabase.from("notifications").insert({
        user_id: quote.expert_id, type: "order_completed",
        title: "Payment released! 💰", message: `€${sellerEarning.toFixed(2)} has been added to your wallet.`,
        data: { job_id: jobId },
      });

      // Email seller: payment released
      sendOrderEmail("payment_released");

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

      // Email admins about dispute
      sendOrderEmail("dispute_raised", { reason: disputeReason.trim() });

      toast({ title: "Dispute raised", description: "Our team will review your case shortly." });
      setDisputeOpen(false);
      setJob((prev: any) => prev ? { ...prev, status: "disputed" } : prev);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDisputeLoading(false);
  };

  // Seller cancels delivery
  const handleCancelDelivery = async () => {
    if (!cancelReason.trim() || !jobId) return;
    setCancelLoading(true);
    try {
      // Revert escrow_status back to paid
      await supabase.from("jobs").update({ escrow_status: "paid", status: "cancelled" }).eq("id", jobId);

      // Notify buyer
      if (job?.buyer_id) {
        await supabase.from("notifications").insert({
          user_id: job.buyer_id, type: "order_cancelled",
          title: "Order cancelled by seller",
          message: cancelReason.trim(),
          data: { job_id: jobId },
        });
      }

      // Notify admins via notification (for manual refund processing)
      const { data: adminRoles } = await supabase
        .from("user_roles").select("user_id").eq("role", "admin");
      if (adminRoles) {
        await Promise.all(adminRoles.map((a) =>
          supabase.from("notifications").insert({
            user_id: a.user_id, type: "order_cancelled",
            title: "Seller cancelled order — refund needed",
            message: `Seller cancelled order "${job.title}". Reason: ${cancelReason.trim()}`,
            data: { job_id: jobId, quote_id: quote?.id },
          })
        ));
      }

      // Email buyer about cancellation
      sendOrderEmail("order_cancelled", { reason: cancelReason.trim() });

      toast({ title: "Order cancelled", description: "The buyer and admin have been notified." });
      setCancelOpen(false);
      setJob((prev: any) => prev ? { ...prev, status: "cancelled", escrow_status: "paid" } : prev);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCancelLoading(false);
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

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightboxImage(null)}
        >
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 rounded-full"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Prev */}
          {lightboxImages.length > 1 && lightboxIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 rounded-full"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i - 1); setLightboxImage(lightboxImages[lightboxIndex - 1]); }}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Image */}
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
          />

          {/* Next */}
          {lightboxImages.length > 1 && lightboxIndex < lightboxImages.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-14 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 rounded-full"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i + 1); setLightboxImage(lightboxImages[lightboxIndex + 1]); }}
            >
              <ArrowLeft className="h-6 w-6 rotate-180" />
            </Button>
          )}

          {/* Counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-primary-foreground/70 text-sm bg-black/40 px-3 py-1 rounded-full">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}
        </div>
      )}

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
  const paymentStatus = job.escrow_status || "paid";
  const otherPartyProfile = isBuyer ? sellerProfile : buyerProfile;
  const otherPartyLabel = isBuyer ? "Seller" : "Buyer";

  const getPaymentStatusInfo = () => {
    switch (paymentStatus) {
      case "paid":
        return { label: "Paid — In Progress", color: "text-primary", bg: "bg-primary/10" };
      case "delivered":
        return { label: "Delivered — Awaiting Confirmation", color: "text-chart-2", bg: "bg-chart-2/10" };
      case "completed":
        return { label: "Completed — Payment Released", color: "text-chart-3", bg: "bg-chart-3/10" };
      default:
        return { label: "Paid", color: "text-primary", bg: "bg-primary/10" };
    }
  };

  const statusInfo = getPaymentStatusInfo();

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
        {/* Back button & title */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(fromPath ?? (isBuyer ? "/orders/purchased" : "/orders/sold"))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-snug line-clamp-2">{job.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{job.category}</Badge>
              <Badge variant={isCompleted ? "default" : isDisputed ? "destructive" : "secondary"} className="text-xs">
                {isCompleted ? "Completed" : isDisputed ? "Disputed" : "In Progress"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          {/* Left: Order details + Actions */}
          <div className="lg:col-span-1 space-y-4">
            {/* Payment Status */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${statusInfo.bg}`}>
                    <CreditCard className={`h-5 w-5 ${statusInfo.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Status</p>
                    <p className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/[0.04] rounded-lg p-2.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Paid via PayPal. Funds are released to the seller once delivery is confirmed.</span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery countdown — hide once delivered/completed */}
            {!isCompleted && paymentStatus === "paid" && (
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
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Service price</span>
                  <span className="font-semibold text-foreground">{format(Number(quote.price))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Other party info */}
            <Card className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate(isBuyer ? `/mentor/${quote.expert_id}` : `/mentor/${job.buyer_id}`)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
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
            {isSeller && !isCompleted && !isDisputed && job.status !== "cancelled" && (
              <div className="space-y-2">
                {paymentStatus === "paid" && (
                  <>
                    <Button className="w-full gap-2" onClick={() => setDeliverConfirmOpen(true)}>
                      <Package className="h-4 w-4" /> Mark as Delivered
                    </Button>
                    <Button variant="outline" className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelOpen(true)}>
                      <XCircle className="h-4 w-4" /> Cancel Order
                    </Button>
                  </>
                )}
                {paymentStatus === "delivered" && (
                  <>
                    <div className="rounded-lg border border-border bg-primary/[0.03] p-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Hourglass className="h-4 w-4 text-primary" /> Awaiting buyer confirmation
                      </div>
                      {autoReleaseSecondsLeft !== null && autoReleaseSecondsLeft > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Auto-releases in <span className="font-semibold text-primary">{formatCountdown(autoReleaseSecondsLeft)}</span> if buyer doesn't act
                        </p>
                      )}
                    </div>
                    <Button variant="outline" className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelOpen(true)}>
                      <Undo2 className="h-4 w-4" /> Cancel Delivery
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Buyer Actions */}
            {isBuyer && !isCompleted && !isDisputed && (
              <div className="space-y-2">
                {paymentStatus === "paid" && (
                  <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2 p-3">
                    <Clock className="h-4 w-4" /> Seller is working on your order
                  </div>
                )}
                {paymentStatus === "delivered" && (
                  <>
                    <Button className="w-full gap-2" onClick={() => setConfirmOpen(true)}>
                      <CheckCircle2 className="h-4 w-4" /> Confirm Delivery & Release Payment
                    </Button>
                    {/* 3-day auto-release notice */}
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Hourglass className="h-3.5 w-3.5 text-primary shrink-0" /> Auto-release countdown
                      </div>
                      {autoReleaseSecondsLeft !== null && autoReleaseSecondsLeft > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Payment will be <span className="text-foreground font-medium">automatically released</span> to the seller in{" "}
                          <span className="font-bold text-primary">{formatCountdown(autoReleaseSecondsLeft)}</span> if you don't confirm or dispute.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Auto-release is pending...</p>
                      )}
                    </div>
                  </>
                )}
                <Button variant="outline" className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDisputeOpen(true)}>
                  <AlertTriangle className="h-4 w-4" /> Raise Dispute
                </Button>
              </div>
            )}

            {/* Video Call button — visible to both parties when order is active */}
            {!isCompleted && !isDisputed && job.status !== "cancelled" && sessionId && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setMeetDialogOpen(true)}
              >
                <Video className="h-4 w-4" /> Schedule a Video Call
              </Button>
            )}

            {/* Post-completion actions */}
            {isBuyer && isCompleted && !hasReviewed && (
              <Button className="w-full gap-2" onClick={() => setReviewOpen(true)}>
                <Star className="h-4 w-4" /> Leave a Review
              </Button>
            )}
            {isBuyer && isCompleted && hasReviewed && (
              <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-chart-3" /> Review submitted
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-2 lg:sticky lg:top-4">
            <Card className="flex flex-col" style={{ height: "calc(100vh - 140px)", minHeight: "520px" }}>
              <CardHeader className="pb-3 border-b border-border shrink-0">
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
                      const isMeetMsg = msg.content.startsWith("📹 Video Call:") || msg.content.includes("meet.google.com/");
                      const meetUrl = isMeetMsg ? (msg.content.match(/https?:\/\/[^\s]+/)?.[0] ?? null) : null;
                      const isDeliveryMsg = msg.content.startsWith("📦 DELIVERED:");

                      // Delivery system message
                      if (isDeliveryMsg) {
                        return (
                          <div key={msg.id} className="flex justify-center my-3">
                            <div className="w-full max-w-sm">
                              <div className="flex items-center gap-2 mb-2 justify-center">
                                <div className="h-px flex-1 bg-border/60" />
                                <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground/70 px-1">System</span>
                                <div className="h-px flex-1 bg-border/60" />
                              </div>
                              <div className="rounded-xl border border-chart-2/30 bg-chart-2/5 overflow-hidden">
                                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-chart-2/20 bg-chart-2/8">
                                  <div className="h-8 w-8 rounded-lg bg-chart-2/15 flex items-center justify-center shrink-0">
                                    <Package className="h-4 w-4 text-chart-2" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">Order Delivered</p>
                                    <p className="text-[10px] text-muted-foreground">Awaiting buyer confirmation</p>
                                  </div>
                                </div>
                                <div className="px-4 py-3 space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    The seller has marked this order as delivered. Confirm delivery to release payment, or raise a dispute if there's an issue.
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/70 font-medium">
                                    ⏳ Payment auto-releases in 3 days if no action is taken.
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/60 text-right">
                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (isMeetMsg && meetUrl) {
                        return (
                          <div key={msg.id} className="flex justify-center my-3">
                            <div className="w-full max-w-sm">
                              {/* system label */}
                              <div className="flex items-center gap-2 mb-2 justify-center">
                                <div className="h-px flex-1 bg-border/60" />
                                <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground/70 px-1">System</span>
                                <div className="h-px flex-1 bg-border/60" />
                              </div>
                              <div className="rounded-xl border border-primary/25 bg-primary/5 overflow-hidden">
                                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-primary/15 bg-primary/8">
                                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                                    <Video className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">Video Call Scheduled</p>
                                    <p className="text-[10px] text-muted-foreground">Google Meet</p>
                                  </div>
                                </div>
                                <div className="px-4 py-3 space-y-2.5">
                                  <p className="text-xs text-muted-foreground font-mono truncate">{meetUrl.replace(/^https?:\/\//, "")}</p>
                                  <a
                                    href={meetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 hover:opacity-90 transition-opacity"
                                  >
                                    Join Call <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <p className="text-[10px] text-muted-foreground/60 text-center">
                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted/40 text-foreground rounded-bl-md"
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.content === "📷 Image" ? "" : msg.content}</p>
                            {/* Image attachments */}
                            {msg.image_urls && msg.image_urls.length > 0 && (
                              <div className={`grid gap-1.5 mt-1.5 ${msg.image_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                                {msg.image_urls.map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt="Attachment"
                                    className="rounded-lg max-h-48 w-full object-cover cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all duration-150"
                                    onClick={() => { setLightboxImages(msg.image_urls!); setLightboxIndex(i); setLightboxImage(url); }}
                                  />
                                ))}
                              </div>
                            )}
                            <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {isDisputed && (
                    <div className="flex justify-center my-3">
                      <div className="w-full max-w-sm">
                        <div className="flex items-center gap-2 mb-2 justify-center">
                          <div className="h-px flex-1 bg-border/60" />
                          <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground/70 px-1">System</span>
                          <div className="h-px flex-1 bg-border/60" />
                        </div>
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
                          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-destructive/20 bg-destructive/8">
                            <div className="h-8 w-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-4 w-4 text-destructive" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-destructive">Dispute Raised</p>
                              <p className="text-[10px] text-muted-foreground">Under admin review</p>
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            <p className="text-xs text-muted-foreground text-center">
                              Our team will review this case and reach out to both parties within 24–48 hours.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="border-t border-border p-3 shrink-0">
                {/* Pending image previews */}
                {pendingImages.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {pendingImages.map((img, i) => (
                      <div key={i} className="relative h-16 w-16">
                        <img src={img.preview} alt="Preview" className="h-16 w-16 rounded-md object-cover border border-border" />
                        <button
                          type="button"
                          onClick={() => removePendingImage(i)}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 mb-0.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendingChat || pendingImages.length >= 4}
                    title="Attach images"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Textarea
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      // Auto-grow up to 5 lines
                      e.target.style.height = 'auto';
                      const lineHeight = 20;
                      const maxHeight = lineHeight * 5 + 16; // 5 lines + padding
                      e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                        // Reset height after send
                        const target = e.target as HTMLTextAreaElement;
                        setTimeout(() => { target.style.height = 'auto'; }, 0);
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 min-h-[40px] resize-none overflow-y-auto py-2"
                    style={{ height: 'auto', maxHeight: '116px' }}
                    disabled={sendingChat}
                    rows={1}
                  />
                  <Button type="submit" size="icon" className="shrink-0 mb-0.5" disabled={(!chatInput.trim() && pendingImages.length === 0) || sendingChat}>
                    {sendingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </main>
      

      {/* Mark as Delivered Confirmation Dialog */}
      <Dialog open={deliverConfirmOpen} onOpenChange={setDeliverConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-chart-2" /> Mark Order as Delivered
            </DialogTitle>
            <DialogDescription>
              Confirm that you've completed the work and are ready to submit it for buyer review.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
              <span>The buyer will be notified and asked to confirm delivery.</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Hourglass className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>If the buyer doesn't confirm or dispute within <strong className="text-foreground">3 days</strong>, payment is automatically released to you.</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Star className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>A 5-star review is auto-submitted if the order auto-completes.</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeliverConfirmOpen(false)} disabled={deliveringOrder}>Cancel</Button>
            <Button onClick={handleSellerDeliver} disabled={deliveringOrder} className="gap-2">
              {deliveringOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              {deliveringOrder ? "Submitting..." : "Confirm Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Call Dialog */}
      <Dialog open={meetDialogOpen} onOpenChange={setMeetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-chart-2" /> Schedule a Video Call
            </DialogTitle>
            <DialogDescription>
              Create a Google Meet and paste the link below. It will appear as a join button in the chat for both parties.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <a
              href="https://meet.google.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-chart-2/10 text-chart-2 font-medium px-4 py-3 hover:bg-chart-2/20 transition-colors text-sm"
            >
              <Video className="h-4 w-4" />
              Open Google Meet to create a room
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="text-xs text-center text-muted-foreground">
              After opening Meet, copy the link from your browser and paste it below.
            </p>
            <div className="flex gap-2">
              <Input
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleSendMeetLink(); }}
              />
              <Button onClick={handleSendMeetLink} disabled={!meetLink.trim() || sendingMeet} className="gap-2">
                {sendingMeet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-chart-3" /> Confirm Delivery
            </DialogTitle>
            <DialogDescription>
              Once you confirm, the payment will be released to the seller's wallet. This action cannot be undone.
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
                    reviewComment.includes(tag) ? "bg-primary text-primary-foreground border-primary" : "bg-accent/40 text-muted-foreground border-border hover:bg-accent"
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

      {/* Cancel Delivery Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> Cancel Order
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling. The buyer will be notified and an admin will process the refund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                "Buyer requested refund",
                "Delivery time overdue",
                "Cannot complete buyer request",
                "Buyer is unresponsive",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setCancelReason(reason)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    cancelReason === reason
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-accent/40 text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Add more details or type a custom reason..."
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelLoading}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelDelivery}
              disabled={cancelLoading || !cancelReason.trim()}
              className="gap-2"
            >
              {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {cancelLoading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Order;
