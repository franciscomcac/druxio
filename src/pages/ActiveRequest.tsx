import { useState, useEffect, useRef } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useModeration } from "@/hooks/use-moderation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Check, Clock, Send, MessageSquare, XCircle, Users, ThumbsUp,
  ArrowLeft, Zap, Loader2, CreditCard, ShieldCheck, RefreshCw, ChevronRight,
  ImageIcon, X as XIcon, Ban, Package, Timer, DollarSign, Search,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDistanceToNow, differenceInDays, differenceInHours, addDays } from "date-fns";

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
  image_urls?: string[] | null;
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

// Represents one seller-side conversation entry in the sidebar
interface SellerConvo {
  jobId: string;
  jobTitle: string;
  jobCategory: string;
  jobStatus: string;
  quoteStatus: string;
  buyerId: string;
  buyerName: string | null;
  buyerAvatar: string | null;
  buyerRating: number | null;
  buyerTotalSpent: number | null;
  myPrice: number;
  myDelivery: number;
  myQuoteId: string;
  sessionId: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  budgetMin: number;
  budgetMax: number;
  quoteCreatedAt: string;
  deadlineMinutes: number;
}

const ActiveRequest = () => {
  useSEO({ title: "Active Request", noIndex: true });
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

  // Buyer profile (for single-buyer seller view — legacy, used in buyer layout)
  const [buyerProfile, setBuyerProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  // Seller multi-convo sidebar
  const [sellerConvos, setSellerConvos] = useState<SellerConvo[]>([]);
  const [activeConvoJobId, setActiveConvoJobId] = useState<string | null>(null);
  const [activeConvo, setActiveConvo] = useState<SellerConvo | null>(null);
  const [sellerChatMessages, setSellerChatMessages] = useState<ChatMessage[]>([]);
  const [sellerChatInput, setSellerChatInput] = useState("");
  const [sendingSellerChat, setSendingSellerChat] = useState(false);
  const sellerChatEndRef = useRef<HTMLDivElement>(null);

  // Image upload state — buyer chat
  const [buyerImageFiles, setBuyerImageFiles] = useState<File[]>([]);
  const [buyerImagePreviews, setBuyerImagePreviews] = useState<string[]>([]);
  const buyerFileInputRef = useRef<HTMLInputElement>(null);

  // Image upload state — seller chat
  const [sellerImageFiles, setSellerImageFiles] = useState<File[]>([]);
  const [sellerImagePreviews, setSellerImagePreviews] = useState<string[]>([]);
  const sellerFileInputRef = useRef<HTMLInputElement>(null);

  // Seller new offer form
  const [newQuotePrice, setNewQuotePrice] = useState("");
  const [newQuoteMinutes, setNewQuoteMinutes] = useState("");
  const [newQuoteUnit, setNewQuoteUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Withdraw quote
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Demo chat state
  const [demoChatMessages, setDemoChatMessages] = useState<ChatMessage[]>([]);
  const [demoChatInput, setDemoChatInput] = useState("");
  const [demoPrice, setDemoPrice] = useState(15);
  const [demoDelivery, setDemoDelivery] = useState(60);

  // Demo bot replies
  const DEMO_BOT_REPLIES = [
    "Thanks for your offer! 🙌 Can you tell me more about your experience with this?",
    "That price looks fair. How quickly can you start?",
    "I see you updated your offer — thanks! Let me think about it.",
    "Your delivery time works for me. Do you have any portfolio examples?",
    "Great, I appreciate the quick response! I'll make my decision soon.",
    "Sounds good! I'm comparing a few experts right now.",
  ];

  // Initialize demo chat with welcome message on mount
  useEffect(() => {
    if (demoChatMessages.length === 0) {
      const storedQuote = sessionStorage.getItem("demo_quote_data");
      if (storedQuote) {
        try {
          const parsed = JSON.parse(storedQuote);
          setDemoPrice(parsed.price || 15);
          setDemoDelivery(parsed.estimated_minutes || 60);
          sessionStorage.removeItem("demo_quote_data");
        } catch {}
      }

      const welcomeMessages: ChatMessage[] = [
        {
          id: "demo-welcome-1",
          content: "📋 Order Request\n\n📌 Tutorial: Practice Sending a Quote\n🏷 Category: Getting Started\n💰 Budget: €10 – €25\n⏱ Deadline: 1 day\n\n📄 Details:\nThis is a demo request! Practice chatting and updating your offer here.",
          sender_id: "demo-buyer",
          created_at: new Date(Date.now() - 60000).toISOString(),
        },
        {
          id: "demo-welcome-2",
          content: "Hi there! 👋 I posted this request and I'd love to see what you can offer. Feel free to send me a message or update your quote!",
          sender_id: "demo-buyer",
          created_at: new Date(Date.now() - 30000).toISOString(),
        },
      ];
      setDemoChatMessages(welcomeMessages);
    }
  }, []);

  const handleSendDemoChat = () => {
    if (!demoChatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: `demo-user-${Date.now()}`,
      content: demoChatInput.trim(),
      sender_id: userId || "me",
      created_at: new Date().toISOString(),
    };
    setDemoChatMessages(prev => [...prev, userMsg]);
    setDemoChatInput("");

    // Bot auto-reply after 1-2 seconds
    setTimeout(() => {
      const replyIndex = Math.floor(Math.random() * DEMO_BOT_REPLIES.length);
      const botMsg: ChatMessage = {
        id: `demo-bot-${Date.now()}`,
        content: DEMO_BOT_REPLIES[replyIndex],
        sender_id: "demo-buyer",
        created_at: new Date().toISOString(),
      };
      setDemoChatMessages(prev => [...prev, botMsg]);
    }, 1000 + Math.random() * 1500);
  };

  const handleDemoUpdateOffer = () => {
    const price = parseFloat(newQuotePrice);
    const rawValue = parseInt(newQuoteMinutes) || 20;
    const minutes = newQuoteUnit === "days" ? rawValue * 1440 : newQuoteUnit === "hours" ? rawValue * 60 : rawValue;
    if (isNaN(price) || price <= 0) return;
    setDemoPrice(price);
    setDemoDelivery(minutes);
    setNewQuotePrice("");
    setNewQuoteMinutes("");

    // Add offer update message
    const offerMsg: ChatMessage = {
      id: `demo-offer-${Date.now()}`,
      content: `📋 New offer: €${price.toFixed(2)} — delivery in ${formatDeliveryTime(minutes)}`,
      sender_id: userId || "me",
      created_at: new Date().toISOString(),
    };
    setDemoChatMessages(prev => [...prev, offerMsg]);

    // Bot reply to updated offer
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: `demo-bot-offer-${Date.now()}`,
        content: "I see you updated your offer — thanks! That looks interesting. Let me compare with other quotes. 🤔",
        sender_id: "demo-buyer",
        created_at: new Date().toISOString(),
      };
      setDemoChatMessages(prev => [...prev, botMsg]);
    }, 1500);
  };

  // Stats
  const [onlineCount, setOnlineCount] = useState(0);

  // PayPal checkout state
  const [paypalDialog, setPaypalDialog] = useState<QuoteWithProfile | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const { format } = useCurrency();

  const formatDeliveryTime = (minutes: number) => {
    if (minutes >= 1440) return `${Math.round(minutes / 1440)} day${Math.round(minutes / 1440) !== 1 ? "s" : ""}`;
    if (minutes >= 60) return `${Math.round(minutes / 60)} hour${Math.round(minutes / 60) !== 1 ? "s" : ""}`;
    return `${minutes} min`;
  };

  // ── Load current job ───────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

      // If no jobId (e.g. /quotes route), find first pending quote for this seller
      if (!jobId) {
        const { data: firstQuote } = await supabase
          .from("quotes")
          .select("job_id, status")
          .eq("expert_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (firstQuote) {
          // Check the job is still open
          const { data: jd } = await supabase.from("jobs").select("status").eq("id", firstQuote.job_id).single();
          if (jd?.status === "open") {
            navigate(`/request/${firstQuote.job_id}`, { replace: true });
            return;
          }
        }
        // No pending quotes — show empty state
        setIsBuyer(false);
        setLoading(false);
        return;
      }

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
        const { data: bp } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", jobData.buyer_id).single();
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

      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_online", true);
      setOnlineCount(count || 0);

      setLoading(false);
    };
    loadData();
  }, [jobId]);

  // ── Load ALL seller convos for the sidebar ─────────────────────────────────
  useEffect(() => {
    if (!userId || isBuyer) return;

    const loadSellerConvos = async () => {
      // Get all quotes by this seller
      const { data: myQuotes } = await supabase
        .from("quotes")
        .select("id, job_id, price, estimated_minutes, status, created_at")
        .eq("expert_id", userId)
        .order("created_at", { ascending: false });

      if (!myQuotes || myQuotes.length === 0) return;

      const convos: SellerConvo[] = [];

      await Promise.all(myQuotes.map(async (q) => {
        const { data: jobData } = await supabase.from("jobs").select("id, title, category, status, buyer_id, budget_min, budget_max, deadline_minutes").eq("id", q.job_id).single();
        if (!jobData) return;

        const { data: bp } = await supabase.from("profiles").select("display_name, avatar_url, rating_avg, total_spent").eq("id", jobData.buyer_id).single();

        // Find session for this pair
        const { data: session } = await supabase
          .from("sessions")
          .select("id")
          .eq("mentor_id", userId)
          .eq("mentee_id", jobData.buyer_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let lastMessage: string | null = null;
        let lastMessageAt: string | null = null;
        let unread = 0;

        if (session) {
          const { data: msgs } = await supabase
            .from("messages")
            .select("content, created_at, sender_id, is_read")
            .eq("session_id", session.id)
            .order("created_at", { ascending: false })
            .limit(1);
          if (msgs && msgs.length > 0) {
            lastMessage = msgs[0].content;
            lastMessageAt = msgs[0].created_at;
          }
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("session_id", session.id)
            .eq("is_read", false)
            .neq("sender_id", userId);
          unread = count || 0;
        }

        convos.push({
          jobId: jobData.id,
          jobTitle: jobData.title,
          jobCategory: jobData.category,
          jobStatus: jobData.status,
          quoteStatus: q.status,
          buyerId: jobData.buyer_id,
          buyerName: bp?.display_name || null,
          buyerAvatar: bp?.avatar_url || null,
          buyerRating: bp?.rating_avg || null,
          buyerTotalSpent: bp?.total_spent || null,
          myPrice: q.price,
          myDelivery: q.estimated_minutes,
          myQuoteId: q.id,
          sessionId: session?.id || null,
          lastMessage,
          lastMessageAt,
          unread,
          budgetMin: jobData.budget_min,
          budgetMax: jobData.budget_max,
          quoteCreatedAt: q.created_at || new Date().toISOString(),
          deadlineMinutes: jobData.deadline_minutes,
        });
      }));

      // Sort: unread first, then by most recent activity
      convos.sort((a, b) => {
        // Unread first
        if (a.unread > 0 && b.unread === 0) return -1;
        if (a.unread === 0 && b.unread > 0) return 1;
        // Then current job
        if (a.jobId === jobId) return -1;
        if (b.jobId === jobId) return 1;
        if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        return 0;
      });

      setSellerConvos(convos);

      // Set active convo to current job
      const currentConvo = convos.find(c => c.jobId === jobId);
      if (currentConvo) {
        setActiveConvoJobId(currentConvo.jobId);
        setActiveConvo(currentConvo);
      }
    };

    loadSellerConvos();
  }, [userId, isBuyer, jobId]);

  // ── Load messages for active seller convo ─────────────────────────────────
  useEffect(() => {
    if (!activeConvo?.sessionId) return;
    const sid = activeConvo.sessionId;

    const loadMsgs = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, created_at, image_urls")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });
      if (data) setSellerChatMessages(data as ChatMessage[]);
    };
    loadMsgs();

    const channel = supabase
      .channel(`seller-chat-${sid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `session_id=eq.${sid}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setSellerChatMessages((prev) => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            const filtered = prev.filter(m => !(m.id.startsWith("temp-") && m.content === newMsg.content && m.sender_id === newMsg.sender_id));
            return [...filtered, newMsg];
          });
          // Update last message in sidebar
          setSellerConvos((prev) => prev.map(c =>
            c.jobId === activeConvo.jobId
              ? { ...c, lastMessage: newMsg.content, lastMessageAt: newMsg.created_at }
              : c
          ));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvo?.sessionId, activeConvo?.jobId]);

  // Scroll seller chat
  useEffect(() => {
    sellerChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sellerChatMessages]);

  // ── Realtime: new quotes (buyer) ───────────────────────────────────────────
  useEffect(() => {
    if (!jobId || !isBuyer) return;
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
          if (!selectedChatPartnerId) setSelectedChatPartnerId(q.expert_id);
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

  // ── Sessions & auto-messages (buyer layout) ───────────────────────────────
  useEffect(() => {
    if (!jobId || !userId || quotes.length === 0 || !job || !isBuyer) return;

    const findOrCreateSession = async (mentorId: string, menteeId: string): Promise<[string | null, boolean]> => {
      const { data: existing } = await supabase.from("sessions").select("id").eq("mentor_id", mentorId).eq("mentee_id", menteeId).order("created_at", { ascending: false }).limit(1).maybeSingle();
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

    const sendAutoMessage = async (sid: string, isNew: boolean) => {
      if (!isNew || !userId) return;
      const budgetLine = `\n💰 Budget: €${job.budget_min} – €${job.budget_max}`;
      const deadlineLine = `\n⏱ Deadline: ${formatDeliveryTime(job.deadline_minutes)}`;
      const descLine = job.description ? `\n\n📄 Details:\n${job.description}` : "";
      const content = `📋 Order Request\n\n📌 ${job.title}\n🏷 Category: ${job.category}${budgetLine}${deadlineLine}${descLine}`;
      await supabase.from("messages").insert({ session_id: sid, sender_id: userId, content });
    };

    const loadSessions = async () => {
      for (const quote of quotes) {
        if (sessionMap[quote.expert_id]) continue;
        const [sid, isNew] = await findOrCreateSession(quote.expert_id, userId!);
        if (sid) {
          setSessionMap((prev) => ({ ...prev, [quote.expert_id]: sid }));
          await sendAutoMessage(sid, isNew);
        }
      }
    };
    loadSessions();
  }, [quotes, jobId, userId, isBuyer, job]);

  // ── Load messages for buyer chat ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedChatPartnerId || !isBuyer) return;
    const sid = sessionMap[selectedChatPartnerId];
    if (!sid) return;
    const loadMessages = async () => {
      const { data } = await supabase.from("messages").select("id, content, sender_id, created_at, image_urls").eq("session_id", sid).order("created_at", { ascending: true });
      if (data) setChatMessages((prev) => ({ ...prev, [selectedChatPartnerId]: data as ChatMessage[] }));
    };
    loadMessages();
    const channel = supabase.channel(`chat-${sid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `session_id=eq.${sid}` }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setChatMessages((prev) => {
          const existing = prev[selectedChatPartnerId] || [];
          if (existing.find(m => m.id === newMsg.id)) return prev;
          const filtered = existing.filter(m => !(m.id.startsWith("temp-") && m.content === newMsg.content && m.sender_id === newMsg.sender_id));
          return { ...prev, [selectedChatPartnerId]: [...filtered, newMsg] };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChatPartnerId, sessionMap, isBuyer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedChatPartnerId]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAcceptQuote = (quote: QuoteWithProfile) => setPaypalDialog(quote);

  const handlePayPalCheckout = async () => {
    if (!paypalDialog || !jobId) return;
    setPaypalLoading(true);
    try {
      const createRes = await supabase.functions.invoke("paypal-create-order", { body: { quoteId: paypalDialog.id, jobId } });
      if (createRes.error) throw new Error(createRes.error.message);
      if (createRes.data?.error) throw new Error(createRes.data.error);
      const { paypalOrderId, approvalUrl } = createRes.data;
      if (!approvalUrl) throw new Error("No PayPal approval URL received");
      const paypalWindow = window.open(approvalUrl, "_blank", "width=500,height=700");
      const pollInterval = setInterval(async () => {
        try {
          const captureRes = await supabase.functions.invoke("paypal-capture-order", { body: { paypalOrderId, quoteId: paypalDialog.id, jobId } });
          if (captureRes.data?.success) {
            clearInterval(pollInterval);
            paypalWindow?.close();
            toast({ title: "Payment successful! 🎉", description: `${paypalDialog.profile?.display_name || "The expert"} will start working now.` });
            // Email seller: quote accepted (fire-and-forget)
            supabase.functions.invoke("send-order-email", { body: { event: "quote_accepted", jobId } }).catch(console.error);
            setPaypalDialog(null);
            setPaypalLoading(false);
            navigate(`/order/${jobId}`);
          }
        } catch { /* keep polling */ }
      }, 3000);
      setTimeout(() => { clearInterval(pollInterval); setPaypalLoading(false); }, 300000);
    } catch (err: any) {
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
    if (!chatInput.trim() && buyerImageFiles.length === 0) return;
    if (!selectedChatPartnerId || !userId) return;
    const sid = sessionMap[selectedChatPartnerId];
    if (!sid) return;
    setSendingChat(true);
    const messageContent = chatInput.trim();
    if (messageContent) {
      const flagged = await checkContent(messageContent, "chat message");
      if (flagged) { setSendingChat(false); return; }
    }
    setChatInput("");
    setBuyerImageFiles([]);
    setBuyerImagePreviews([]);

    // Upload images
    let uploadedUrls: string[] = [];
    for (const file of buyerImageFiles) {
      const ext = file.name.split(".").pop();
      const path = `${sid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase.from("messages").insert({
      session_id: sid,
      sender_id: userId,
      content: messageContent || (uploadedUrls.length > 0 ? "📎 Image" : ""),
      image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
    });
    if (error) {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    }
    setSendingChat(false);
  };

  const handleSendSellerChat = async () => {
    if (!sellerChatInput.trim() && sellerImageFiles.length === 0) return;
    if (!userId || !activeConvo?.sessionId) return;
    setSendingSellerChat(true);
    const content = sellerChatInput.trim();
    if (content) {
      const flagged = await checkContent(content, "chat message");
      if (flagged) { setSendingSellerChat(false); return; }
    }
    setSellerChatInput("");
    setSellerImageFiles([]);
    setSellerImagePreviews([]);

    // Upload images
    let uploadedUrls: string[] = [];
    for (const file of sellerImageFiles) {
      const ext = file.name.split(".").pop();
      const path = `${activeConvo.sessionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase.from("messages").insert({
      session_id: activeConvo.sessionId,
      sender_id: userId,
      content: content || (uploadedUrls.length > 0 ? "📎 Image" : ""),
      image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
    });
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    }
    setSendingSellerChat(false);
  };

  const handleSwitchConvo = async (convo: SellerConvo) => {
    setActiveConvoJobId(convo.jobId);
    setActiveConvo(convo);
    setSellerChatMessages([]);
    setSellerChatInput("");
    // If no session yet, create one and auto-send offer
    if (!convo.sessionId && userId) {
      const { data: existing } = await supabase.from("sessions").select("id").eq("mentor_id", userId).eq("mentee_id", convo.buyerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        const updated = { ...convo, sessionId: existing.id };
        setActiveConvo(updated);
        setSellerConvos(prev => prev.map(c => c.jobId === convo.jobId ? updated : c));
      } else {
        const { data: newSession } = await supabase.from("sessions").insert({
          mentor_id: userId, mentee_id: convo.buyerId, status: "pending",
          issue_description: convo.jobTitle, categories: [convo.jobCategory], session_type: "chat",
        }).select("id").single();
        if (newSession) {
          const content = `📋 New offer: €${convo.myPrice.toFixed(2)} — delivery in ${formatDeliveryTime(convo.myDelivery)}`;
          await supabase.from("messages").insert({ session_id: newSession.id, sender_id: userId, content });
          const updated = { ...convo, sessionId: newSession.id };
          setActiveConvo(updated);
          setSellerConvos(prev => prev.map(c => c.jobId === convo.jobId ? updated : c));
        }
      }
    }
  };

  const handleSubmitNewQuote = async () => {
    if (!activeConvo || !userId) return;
    const price = parseFloat(newQuotePrice);
    const rawValue = parseInt(newQuoteMinutes) || 20;
    const minutes = newQuoteUnit === "days" ? rawValue * 1440 : newQuoteUnit === "hours" ? rawValue * 60 : rawValue;
    if (isNaN(price) || price <= 0) { toast({ title: "Enter a valid price", variant: "destructive" }); return; }
    setSubmittingQuote(true);
    const { error } = await supabase.from("quotes").update({ price, estimated_minutes: minutes }).eq("id", activeConvo.myQuoteId);
    if (error) {
      toast({ title: "Failed to update offer", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Offer updated!" });
      const sid = activeConvo.sessionId;
      if (sid) {
        const content = `📋 New offer: €${price.toFixed(2)} — delivery in ${formatDeliveryTime(minutes)}`;
        await supabase.from("messages").insert({ session_id: sid, sender_id: userId, content });
      }
      setSellerConvos(prev => prev.map(c => c.jobId === activeConvo.jobId ? { ...c, myPrice: price, myDelivery: minutes } : c));
      setActiveConvo(prev => prev ? { ...prev, myPrice: price, myDelivery: minutes } : prev);
      setNewQuotePrice("");
      setNewQuoteMinutes("");
    }
    setSubmittingQuote(false);
  };

  // ── Withdraw quote ────────────────────────────────────────────────────────
  const handleWithdrawQuote = async () => {
    if (!activeConvo || !userId) return;
    setWithdrawing(true);
    const { error } = await supabase.from("quotes").update({ status: "rejected" }).eq("id", activeConvo.myQuoteId);
    if (error) {
      toast({ title: "Failed to withdraw", description: error.message, variant: "destructive" });
    } else {
      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: activeConvo.buyerId,
        type: "quote_withdrawn",
        title: "Offer Withdrawn",
        message: `An expert has withdrawn their offer on "${activeConvo.jobTitle}"`,
        data: { job_id: activeConvo.jobId },
      });
      toast({ title: "Quote withdrawn" });
      setSellerConvos(prev => prev.filter(c => c.myQuoteId !== activeConvo.myQuoteId));
      setActiveConvo(null);
      setActiveConvoJobId(null);
    }
    setWithdrawing(false);
    setWithdrawDialog(false);
  };

  const handleBuyerImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBuyerImageFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setBuyerImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };
  const handleSellerImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSellerImageFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setSellerImagePreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  // ── Message bubble renderer ────────────────────────────────────────────────
  const renderMessageBubble = (msg: ChatMessage, isMe: boolean) => {
    const isOfferMsg = msg.content.startsWith("📋 New offer:");
    const isJobMsg = msg.content.startsWith("📋 Order Request");
    const isAutoMsg = isOfferMsg || isJobMsg;
    const hasImages = msg.image_urls && msg.image_urls.length > 0;
    const isImageOnly = ["📎 Image", "📷 Image"].includes(msg.content.trim());
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
              {hasImages && (
                <div className={`grid gap-1.5 mb-1.5 ${msg.image_urls!.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {msg.image_urls!.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="shared image"
                      className="rounded-lg max-w-full object-cover cursor-pointer"
                      style={{ maxHeight: "180px" }}
                      onClick={() => window.open(url, "_blank")}
                    />
                  ))}
                </div>
              )}
              {!isImageOnly && <p className="whitespace-pre-wrap">{msg.content}</p>}
              <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no job and user is buyer, nothing to show. Sellers can still see the demo quote.
  if (!job && isBuyer) return null;

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
  const selectedQuote = isBuyer ? quotes.find(q => q.expert_id === selectedChatPartnerId) : myQuote;
  const chatPartnerName = isBuyer ? selectedQuote?.profile?.display_name || "Expert" : buyerProfile?.display_name || "Buyer";
  const selectedMessages = selectedChatPartnerId ? (chatMessages[selectedChatPartnerId] || []) : [];

  // Demo/tutorial quote — always present, cannot be withdrawn
  const DEMO_CONVO: SellerConvo = {
    jobId: "demo-tutorial-quote",
    jobTitle: "🎓 Tutorial: Practice Quoting",
    jobCategory: "Getting Started",
    jobStatus: "open",
    quoteStatus: "pending",
    buyerId: "demo-buyer",
    buyerName: "Duxio Team",
    buyerAvatar: null,
    buyerRating: 5,
    buyerTotalSpent: 0,
    myPrice: demoPrice,
    myDelivery: demoDelivery,
    myQuoteId: "demo-quote-id",
    sessionId: null,
    lastMessage: demoChatMessages.length > 0 ? demoChatMessages[demoChatMessages.length - 1].content : "Welcome!",
    lastMessageAt: new Date().toISOString(),
    unread: demoChatMessages.filter(m => m.sender_id === "demo-buyer").length > 0 ? 1 : 0,
    budgetMin: 10,
    budgetMax: 25,
    quoteCreatedAt: new Date().toISOString(),
    deadlineMinutes: 1440,
  };

  const isDemo = (convo: SellerConvo) => convo.jobId === "demo-tutorial-quote";

  // Filter to pending quotes only + always include demo
  const realQuoteConvos = sellerConvos.filter(c => c.jobStatus === "open" && c.quoteStatus === "pending");
  const quoteConvos = [...realQuoteConvos, DEMO_CONVO];

  // Helper: get expiry info for a quote
  const getExpiryInfo = (quoteCreatedAt: string) => {
    const expiryDate = addDays(new Date(quoteCreatedAt), 5);
    const now = new Date();
    const daysLeft = differenceInDays(expiryDate, now);
    const hoursLeft = differenceInHours(expiryDate, now);
    if (hoursLeft <= 0) return { label: "Expired", color: "bg-destructive", textColor: "text-destructive", urgent: true };
    if (daysLeft < 1) return { label: `${hoursLeft}h left`, color: "bg-destructive", textColor: "text-destructive", urgent: true };
    if (daysLeft <= 2) return { label: `${daysLeft}d left`, color: "bg-chart-4", textColor: "text-chart-4", urgent: false };
    return { label: `${daysLeft}d left`, color: "bg-chart-2", textColor: "text-chart-2", urgent: false };
  };

  // ── SELLER LAYOUT — Quotes Terminal ────────────────────────────────────────
  if (!isBuyer) {
    const renderConvoItem = (convo: SellerConvo) => {
      const isActive = activeConvoJobId === convo.jobId;
      const expiry = getExpiryInfo(convo.quoteCreatedAt);
      const quotedAgo = formatDistanceToNow(new Date(convo.quoteCreatedAt), { addSuffix: true });

      return (
        <button
          key={convo.jobId}
          onClick={() => {
            if (isDemo(convo)) {
              // Demo quote — show demo content in main area
              setActiveConvoJobId(convo.jobId);
              setActiveConvo(convo);
              setSellerChatMessages([]);
              return;
            }
            handleSwitchConvo(convo);
          }}
          className={`w-full text-left rounded-xl p-3 transition-all ${
            isActive
              ? "bg-primary/10 border border-primary/20"
              : "hover:bg-muted/50 border border-transparent"
          } ${isDemo(convo) ? "ring-1 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}
        >
          <div className="flex items-start gap-2.5">
            {/* Urgency dot */}
            <div className="flex flex-col items-center gap-1 pt-1">
              <span className={`h-2 w-2 rounded-full shrink-0 ${expiry.color}`} />
            </div>
            <Avatar className="h-9 w-9 border border-border shrink-0">
              <AvatarImage src={convo.buyerAvatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {convo.buyerName?.[0] || "B"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className={`text-xs font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                  {convo.buyerName || "Buyer"}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  {convo.unread > 0 && (
                    <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {convo.unread}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{convo.jobTitle}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-primary font-semibold">{format(convo.myPrice)}</p>
                <span className="text-[9px] text-muted-foreground">·</span>
                <p className="text-[10px] text-muted-foreground">{formatDeliveryTime(convo.myDelivery)}</p>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[9px] text-muted-foreground">Quoted {quotedAgo}</p>
                <span className={`text-[9px] font-medium ${expiry.textColor}`}>{expiry.label}</span>
              </div>
            </div>
          </div>
        </button>
      );
    };

    return (
      <div className="h-[calc(100vh-64px)] bg-background flex overflow-hidden">

        {/* ── Left sidebar: quotes list ──────────────────────────────────── */}
        <div className="w-72 border-r border-border bg-card/40 flex flex-col shrink-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <div>
                <p className="text-sm font-semibold text-foreground">Quotes</p>
                <p className="text-[10px] text-muted-foreground">{quoteConvos.length} pending</p>
              </div>
            </div>
          </div>

          {/* Quotes list */}
          <ScrollArea className="flex-1 min-h-0">
            {quoteConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground px-6">
                <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center mb-4">
                  <Zap className="h-7 w-7 text-primary/50" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No pending quotes</p>
                <p className="text-xs text-muted-foreground mb-4">Browse open requests to start quoting</p>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/dashboard")}>
                  <Search className="h-3 w-3 mr-1" />
                  Browse Requests
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-1">{quoteConvos.map(renderConvoItem)}</div>
            )}
          </ScrollArea>
        </div>

        {/* ── Main area ─────────────────────────────────────────────────────── */}
        {activeConvo ? (
          <div className="flex flex-1 min-w-0">
            {/* Chat */}
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              {/* Chat top bar */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/20 shrink-0">
                <Avatar className="h-9 w-9 border border-border shrink-0">
                  <AvatarImage src={activeConvo.buyerAvatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {activeConvo.buyerName?.[0] || "B"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{activeConvo.buyerName || "Buyer"}</p>
                  <p className="text-xs text-muted-foreground truncate">{activeConvo.jobTitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">Your offer</p>
                  <p className="text-base font-bold text-primary">{format(activeConvo.myPrice)}</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-3">
                  {activeConvo && isDemo(activeConvo) ? (
                    <>
                      {demoChatMessages.map((msg) => renderMessageBubble(msg, msg.sender_id !== "demo-buyer"))}
                    </>
                  ) : sellerChatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                      <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center mb-4">
                        <MessageSquare className="h-7 w-7 text-primary/50" />
                      </div>
                      <p className="text-sm font-medium">No messages yet</p>
                      <p className="text-xs mt-1 opacity-60">Your offer was sent automatically</p>
                    </div>
                  ) : (
                    sellerChatMessages.map((msg) => renderMessageBubble(msg, msg.sender_id === userId))
                  )}
                  <div ref={sellerChatEndRef} />
                </div>
              </ScrollArea>

              {activeConvo && isDemo(activeConvo) ? (
                <div className="border-t border-border p-3 shrink-0 bg-card/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary">DEMO</Badge>
                    <span className="text-[10px] text-muted-foreground">Try typing a message — the buyer will auto-reply!</span>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); handleSendDemoChat(); }} className="flex gap-2">
                    <Input
                      value={demoChatInput}
                      onChange={(e) => setDemoChatInput(e.target.value)}
                      placeholder="Try sending a message..."
                      className="bg-background/60 border-border/40 focus:border-primary/40"
                    />
                    <Button type="submit" size="icon" disabled={!demoChatInput.trim()} className="shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              ) : (
              <div className="border-t border-border p-3 shrink-0 bg-card/20">
                <input type="file" accept="image/*" multiple ref={sellerFileInputRef} className="hidden" onChange={handleSellerImageSelect} />
                {sellerImagePreviews.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {sellerImagePreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt="preview" className="h-14 w-14 object-cover rounded-lg border border-border" />
                        <button
                          type="button"
                          onClick={() => { setSellerImageFiles(p => p.filter((_, idx) => idx !== i)); setSellerImagePreviews(p => p.filter((_, idx) => idx !== i)); }}
                          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        >
                          <XIcon className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleSendSellerChat(); }} className="flex gap-2">
                  <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => sellerFileInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Input
                    value={sellerChatInput}
                    onChange={(e) => setSellerChatInput(e.target.value)}
                    placeholder="Reply to buyer..."
                    className="bg-background/60 border-border/40 focus:border-primary/40"
                  />
                  <Button type="submit" size="icon" disabled={(!sellerChatInput.trim() && sellerImageFiles.length === 0) || sendingSellerChat} className="shrink-0">
                    {sendingSellerChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
              )}

            </div>

            {/* ── Right panel: Quote Action Center ──────────────────────────── */}
            <div className="hidden lg:flex flex-col w-72 border-l border-border bg-card/40 shrink-0 overflow-y-auto">
              {/* Expiry countdown */}
              {(() => {
                const expiry = getExpiryInfo(activeConvo.quoteCreatedAt);
                return (
                  <div className={`px-4 py-2.5 border-b border-border flex items-center gap-2 ${
                    expiry.urgent ? "bg-destructive/10" : "bg-muted/30"
                  }`}>
                    <Timer className={`h-3.5 w-3.5 ${expiry.textColor}`} />
                    <span className={`text-xs font-medium ${expiry.textColor}`}>{expiry.label}</span>
                    <span className="text-[10px] text-muted-foreground">until auto-expiry</span>
                  </div>
                );
              })()}

              {/* Request summary */}
              <div className="p-4 border-b border-border space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Request Details</p>
                <p className="text-sm font-semibold text-foreground leading-snug">{activeConvo.jobTitle}</p>
                <Badge variant="outline" className="text-[10px]">{activeConvo.jobCategory}</Badge>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[9px] text-muted-foreground uppercase">Budget</p>
                    <p className="text-xs font-semibold text-foreground">{format(activeConvo.budgetMin)} – {format(activeConvo.budgetMax)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[9px] text-muted-foreground uppercase">Deadline</p>
                    <p className="text-xs font-semibold text-foreground">{formatDeliveryTime(activeConvo.deadlineMinutes)}</p>
                  </div>
                </div>
              </div>

              {/* Buyer info */}
              <div className="p-4 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Buyer</p>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={activeConvo.buyerAvatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{activeConvo.buyerName?.[0] || "B"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{activeConvo.buyerName || "Buyer"}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {activeConvo.buyerRating && activeConvo.buyerRating > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                          {activeConvo.buyerRating.toFixed(1)}
                        </span>
                      )}
                      {activeConvo.buyerTotalSpent !== null && activeConvo.buyerTotalSpent > 0 && (
                        <span>{format(activeConvo.buyerTotalSpent)} spent</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Your current offer */}
              <div className="p-4 border-b border-border space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your Offer</p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Price</span>
                    <span className="text-lg font-bold text-primary">{format(activeConvo.myPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">Delivery</span>
                    <span className="text-sm font-medium text-foreground">{formatDeliveryTime(activeConvo.myDelivery)}</span>
                  </div>
                </div>
              </div>

              {/* Update offer */}
              {(
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Update Offer</p>
                <Input
                  type="number"
                  placeholder="New price (€)"
                  value={newQuotePrice}
                  onChange={(e) => setNewQuotePrice(e.target.value)}
                  className="text-sm h-8 bg-background/60"
                />
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    placeholder="Time"
                    value={newQuoteMinutes}
                    onChange={(e) => setNewQuoteMinutes(e.target.value)}
                    className="text-sm h-8 bg-background/60 flex-1"
                  />
                  <div className="flex border border-border rounded-md overflow-hidden h-8 text-xs shrink-0">
                    {(["minutes", "hours", "days"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setNewQuoteUnit(u)}
                        className={`px-2 transition-colors ${newQuoteUnit === u ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      >
                        {u === "minutes" ? "min" : u === "hours" ? "hr" : "day"}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={handleSubmitNewQuote}
                  disabled={submittingQuote || !newQuotePrice}
                >
                  {submittingQuote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Send Updated Offer
                </Button>
              </div>
              )}

              {/* Withdraw quote — only for pending quotes */}
              {activeConvo.quoteStatus === "pending" && activeConvo.jobStatus === "open" && !isDemo(activeConvo) && (
                <div className="p-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setWithdrawDialog(true)}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Withdraw Quote
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto mb-4">
                <Zap className="h-7 w-7 text-primary/50" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {quoteConvos.length > 0 ? "Select a quote" : "No pending quotes"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {quoteConvos.length > 0 ? "Pick a conversation from the sidebar" : "Browse open requests to start quoting"}
              </p>
              {quoteConvos.length === 0 && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/dashboard")}>
                  <Search className="h-3 w-3 mr-1" />
                  Browse Requests
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Withdraw Quote Dialog */}
        <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />Withdraw Quote
              </DialogTitle>
              <DialogDescription>
                This will remove your offer on &quot;{activeConvo?.jobTitle}&quot;. The buyer will be notified. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setWithdrawDialog(false)} disabled={withdrawing}>Cancel</Button>
              <Button variant="destructive" onClick={handleWithdrawQuote} disabled={withdrawing} className="gap-1.5">
                {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Withdraw
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── BUYER LAYOUT ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6">
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
                  <Users className="h-3 w-3" />{onlineCount} online
                </span>
              </div>
            </div>
            {isBuyer && job.status === "open" && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0" onClick={handleCancelRequest}>
                <XCircle className="h-4 w-4 mr-1" />Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Offers */}
        <div className="mb-6 sm:mb-8">
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
          <div className={`space-y-2 ${sortedQuotes.length > 4 ? "max-h-[360px] overflow-y-auto pr-1" : ""}`}>
                {sortedQuotes.map((quote, i) => {
                  const isSelected = selectedChatPartnerId === quote.expert_id;
                  const isRecommended = quote.id === recommendedId;
                  const isFastest = quote.id === fastestId;
                  return (
                    <div
                      key={quote.id}
                      onClick={() => setSelectedChatPartnerId(quote.expert_id)}
                      className={`relative rounded-xl border p-3 sm:p-4 cursor-pointer transition-all ${
                        isSelected ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={quote.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{quote.profile?.display_name?.[0] || "E"}</AvatarFallback>
                          </Avatar>
                          <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{quote.profile?.display_name || "Expert"}</p>
                            {isRecommended && <Badge className="text-[10px] h-4 bg-primary/90">Recommended</Badge>}
                            {isFastest && !isRecommended && <Badge variant="outline" className="text-[10px] h-4">Fastest</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {quote.profile?.rating_avg && quote.profile.rating_avg > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-primary text-primary" />{quote.profile.rating_avg.toFixed(1)}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />{formatDeliveryTime(quote.estimated_minutes)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-primary">{format(quote.price)}</p>
                          <Button size="sm" className="mt-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleAcceptQuote(quote); }}>
                            <CreditCard className="h-3 w-3 mr-1" />Accept & Pay
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />Live chat with sellers
          </h2>
          {quotes.length > 1 && (
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {sortedQuotes.map((q) => (
                <button
                  key={q.expert_id}
                  onClick={() => setSelectedChatPartnerId(q.expert_id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    selectedChatPartnerId === q.expert_id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Avatar className="h-4 w-4"><AvatarFallback className="text-[8px]">{q.profile?.display_name?.[0] || "E"}</AvatarFallback></Avatar>
                  {q.profile?.display_name || "Expert"}
                </button>
              ))}
            </div>
          )}
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden flex flex-col" style={{ height: "560px" }}>
            {selectedQuote && (
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/60 shrink-0">
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarImage src={selectedQuote.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{chatPartnerName[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{chatPartnerName}</p>
                  <p className="text-xs text-muted-foreground">{format(selectedQuote.price)} · {formatDeliveryTime(selectedQuote.estimated_minutes)} delivery</p>
                </div>
              </div>
            )}
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
            <div className="border-t border-border p-3 shrink-0 bg-card/20">
              <input type="file" accept="image/*" multiple ref={buyerFileInputRef} className="hidden" onChange={handleBuyerImageSelect} />
              {buyerImagePreviews.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {buyerImagePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="preview" className="h-14 w-14 object-cover rounded-lg border border-border" />
                      <button
                        type="button"
                        onClick={() => { setBuyerImageFiles(p => p.filter((_, idx) => idx !== i)); setBuyerImagePreviews(p => p.filter((_, idx) => idx !== i)); }}
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <XIcon className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => buyerFileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-background/60 border-border/40 focus:border-primary/40"
                />
                <Button type="submit" size="icon" disabled={(!chatInput.trim() && buyerImageFiles.length === 0) || sendingChat}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* PayPal Dialog */}
      <Dialog open={!!paypalDialog} onOpenChange={() => { if (!paypalLoading) setPaypalDialog(null); }}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />Confirm & Pay
            </DialogTitle>
            <DialogDescription>Funds will be held in escrow until you confirm delivery.</DialogDescription>
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PayPal fee (3.49% + €0.35)</span>
                  <span className="font-medium text-foreground">€{(paypalDialog.price * 1.05 * 0.0349 + 0.35).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary">€{(paypalDialog.price * 1.05 * 1.0349 + 0.35).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                Funds are held in escrow and released only after you confirm delivery.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaypalDialog(null)} disabled={paypalLoading}>Cancel</Button>
            <Button onClick={handlePayPalCheckout} disabled={paypalLoading} className="gap-2">
              {paypalLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><CreditCard className="h-4 w-4" /> Pay with PayPal</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveRequest;
