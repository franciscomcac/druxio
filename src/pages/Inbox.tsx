import { useState, useEffect, useRef, useCallback } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Send,
  ExternalLink,
  ChevronLeft,
  Inbox as InboxIcon,
  ShoppingBag,
  MessageSquare,
  Clock,
  CheckCircle2,
  Package,
  Loader2,
  ImageIcon,
  X,
  ZoomIn,
  LayoutList,
  AlertTriangle,
  Video,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationItem {
  sessionId: string;
  jobId: string | null;
  jobTitle: string;
  jobCategory: string;
  jobStatus: string; // open | accepted | completed | delivered | cancelled
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  otherUserOnline: boolean;
  iAmSeller: boolean;
  convType: "order" | "delivered" | "cancelled";
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  myPrice?: number | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  image_urls: string[] | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  order: {
    label: "Order",
    badgeClass: "bg-green-500/15 text-green-500 border-green-500/30",
    icon: <ShoppingBag className="h-3 w-3" />,
  },
  delivered: {
    label: "Delivered",
    badgeClass: "bg-orange-500/15 text-orange-500 border-orange-500/30",
    icon: <Package className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-red-500/15 text-red-500 border-red-500/30",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

function timeLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffHours = (now.getTime() - d.getTime()) / 3600000;
  if (diffHours < 24) return format(d, "HH:mm");
  if (diffHours < 48 * 24) return formatDistanceToNow(d, { addSuffix: true });
  return format(d, "MMM d");
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Inbox = () => {
  useSEO({ title: "Inbox", noIndex: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false); // mobile: show chat panel
  const [activeFilter, setActiveFilter] = useState<"all" | "order" | "delivered" | "cancelled">("all");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activeConvRef = useRef<ConversationItem | null>(null);

  // ── Fetch all conversations ────────────────────────────────────────────────

  const fetchConversations = useCallback(async (uid: string) => {
    // 1. Fetch all sessions the user is part of
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, mentor_id, mentee_id, status, categories, issue_description, created_at")
      .or(`mentee_id.eq.${uid},mentor_id.eq.${uid}`);

    if (!sessions || sessions.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // 2. Gather all other user ids
    const otherIds = [...new Set(sessions.map(s => s.mentor_id === uid ? s.mentee_id : s.mentor_id))];

    // 3. Fetch profiles in bulk
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_online")
      .in("id", otherIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // 4. Fetch accepted quotes to find linked jobs (seller → buyer → job)
    const { data: myQuotes } = await supabase
      .from("quotes")
      .select("id, job_id, expert_id, price, status")
      .eq("expert_id", uid);

    // 5. Fetch jobs: ones I bought OR ones I quoted on
    const quotedJobIds = (myQuotes || []).map(q => q.job_id);
    const { data: myBuyerJobs } = await supabase
      .from("jobs")
      .select("id, title, category, status, buyer_id, accepted_quote_id, delivered_at")
      .eq("buyer_id", uid);

    const { data: quotedJobs } = quotedJobIds.length
      ? await supabase
          .from("jobs")
          .select("id, title, category, status, buyer_id, accepted_quote_id, delivered_at")
          .in("id", quotedJobIds)
      : { data: [] };

    const allJobs = [...(myBuyerJobs || []), ...(quotedJobs || [])];
    const jobMap = new Map(allJobs.map(j => [j.id, j]));

    // Build quote map: job_id → quote info (for sellers)
    const quoteByJobId = new Map(
      (myQuotes || []).map(q => [q.job_id, q])
    );

    // 6. For each session, find the linked job
    //    - If I am seller (mentor): find a job where I quoted + buyer = mentee
    //    - If I am buyer (mentee): find my job where seller = mentor

    const convItems: ConversationItem[] = [];

    for (const session of sessions) {
      const iAmSeller = session.mentor_id === uid;
      const otherId = iAmSeller ? session.mentee_id : session.mentor_id;
      const otherProfile = profileMap.get(otherId);

      let linkedJob: (typeof allJobs)[0] | undefined;
      let myPrice: number | null = null;

      if (iAmSeller) {
        // Find a quoted job where buyer_id = mentee_id
        linkedJob = allJobs.find(j =>
          j.buyer_id === session.mentee_id &&
          quoteByJobId.has(j.id)
        );
        if (linkedJob) {
          myPrice = quoteByJobId.get(linkedJob.id)?.price ?? null;
        }
      } else {
        // Find my job where the mentor quoted
        linkedJob = allJobs.find(j =>
          j.buyer_id === uid &&
          (myQuotes || []).some(q => q.job_id === j.id && q.expert_id === session.mentor_id)
        );
        // Or just any job I own linked to this session partner
        if (!linkedJob) {
          linkedJob = allJobs.find(j => j.buyer_id === uid);
        }
      }

      // Determine conversation type — skip pure quotes (no accepted order)
      let convType: ConversationItem["convType"] = "order";
      if (linkedJob) {
        if (["cancelled", "disputed"].includes(linkedJob.status)) convType = "cancelled";
        else if (linkedJob.delivered_at || linkedJob.status === "completed") convType = "delivered";
        else if (["accepted", "in_progress"].includes(linkedJob.status)) convType = "order";
        else continue; // skip open/quote-only conversations — they belong in the Quotes Terminal
      } else {
        continue; // no linked job = skip
      }

      // Last message + unread
      const { data: lastMsgArr } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { count: unreadCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("is_read", false)
        .neq("sender_id", uid);

      const lastMsg = lastMsgArr?.[0] ?? null;

      convItems.push({
        sessionId: session.id,
        jobId: linkedJob?.id ?? null,
        jobTitle: linkedJob?.title ?? session.issue_description ?? session.categories?.[0] ?? "Conversation",
        jobCategory: linkedJob?.category ?? session.categories?.[0] ?? "",
        jobStatus: linkedJob?.status ?? "open",
        otherUserId: otherId,
        otherUserName: otherProfile?.display_name ?? (iAmSeller ? "Buyer" : "Expert"),
        otherUserAvatar: otherProfile?.avatar_url ?? null,
        otherUserOnline: otherProfile?.is_online ?? false,
        iAmSeller,
        convType,
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.created_at ?? session.created_at,
        unreadCount: unreadCount ?? 0,
        myPrice,
      });
    }

    // Sort: by lastMessageAt desc only (unread badges show without reordering)
    convItems.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });

    setConversations(convItems);
    setLoading(false);
  }, []);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      fetchConversations(user.id);
    });
  }, [fetchConversations, navigate]);

  // ── Global realtime: refresh sidebar on any message / session change ───────

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("inbox-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as Message & { session_id: string };
        const isActiveConv = activeConvRef.current?.sessionId === newMsg.session_id;
        const isFromOther = newMsg.sender_id !== userId;

        // If message is in the open conversation and from the other user → mark read immediately
        if (isActiveConv && isFromOther) {
          supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
        }

        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.sessionId !== newMsg.session_id) return c;
            // Clean up placeholder text for sidebar preview
            const previewText = ["📎 Image", "📷 Image"].includes(newMsg.content.trim())
              ? "📷 Photo"
              : newMsg.content;
            return {
              ...c,
              lastMessage: previewText,
              lastMessageAt: newMsg.created_at,
              // Only increment unread if the conv is NOT currently open
              unreadCount: isFromOther && !isActiveConv ? c.unreadCount + 1 : c.unreadCount,
            };
          });
          // Re-sort by latest message only
          return [...updated].sort((a, b) => {
            const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return tb - ta;
          });
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs" }, () => {
        fetchConversations(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetchConversations]);

  // ── Load messages for active conversation ──────────────────────────────────

  const loadMessages = useCallback(async (conv: ConversationItem) => {
    setMsgLoading(true);
    setMessages([]);
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at, image_urls")
      .eq("session_id", conv.sessionId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
    setMsgLoading(false);
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv);

    // Per-conversation realtime
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`chat-${activeConv.sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `session_id=eq.${activeConv.sessionId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark read immediately if from other user
          if (newMsg.sender_id !== userId) {
            supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [activeConv?.sessionId, loadMessages, userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Select conversation ────────────────────────────────────────────────────

  const selectConv = (conv: ConversationItem) => {
    setActiveConv(conv);
    activeConvRef.current = conv;
    setShowChat(true);
    setInputText("");
    setImageFiles([]);
    setImagePreviewUrls([]);

    // Always mark messages as read when opening a conversation (not just when unreadCount > 0)
    // This ensures read status persists even after navigating away and back
    if (userId) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .eq("session_id", conv.sessionId)
        .neq("sender_id", userId)
        .eq("is_read", false)
        .then(() => {
          setConversations(prev => prev.map(c =>
            c.sessionId === conv.sessionId ? { ...c, unreadCount: 0 } : c
          ));
        });
    }
  };

  // ── Send message ───────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!activeConv || !userId || (!inputText.trim() && imageFiles.length === 0)) return;
    setSending(true);

    let uploadedUrls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop();
      const path = `${activeConv.sessionId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    await supabase.from("messages").insert({
      session_id: activeConv.sessionId,
      sender_id: userId,
      content: inputText.trim() || (uploadedUrls.length > 0 ? "📎 Image" : ""),
      image_urls: uploadedUrls,
    });

    setInputText("");
    setImageFiles([]);
    setImagePreviewUrls([]);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setImagePreviewUrls(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (i: number) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i));
    setImagePreviewUrls(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Message bubble renderer ────────────────────────────────────────────────

  const renderBubble = (msg: Message) => {
    const isMe = msg.sender_id === userId;
    const isOfferMsg = msg.content.startsWith("📋 New offer:");
    const isJobMsg = msg.content.startsWith("📋 Order Request");
    const isVideoCall = msg.content.startsWith("📹 Video Call") || msg.content.includes("meet.google.com/");
    const isDeliveryMsg = msg.content.startsWith("📦 DELIVERED:");
    const isImageOnly = ["📎 Image", "📷 Image"].includes(msg.content.trim());
    const isAutoCard = isOfferMsg || isJobMsg || isVideoCall;

    // ── Delivery system card ──
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
                <p className="text-[10px] text-muted-foreground/60">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
                {activeConv?.jobId && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full gap-1.5 h-8 text-xs text-muted-foreground"
                      onClick={() => navigate(`/order/${activeConv.jobId}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Order
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Styled card messages ──
    if (isAutoCard) {
      if (isVideoCall) {
        const url = msg.content.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
        return (
          <div key={msg.id} className="flex justify-center my-3">
            <div className="w-full max-w-sm">
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
                  {url && (
                    <>
                      <p className="text-xs text-muted-foreground font-mono truncate">{url.replace(/^https?:\/\//, "")}</p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 hover:opacity-90 transition-opacity"
                      >
                        Join Call <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      const lines = msg.content.split("\n");
      return (
        <div key={msg.id} className="flex justify-center my-3">
          <div className={cn(
            "rounded-xl px-4 py-3 text-sm border max-w-xs w-full",
            isOfferMsg
              ? "bg-primary/10 border-primary/30"
              : "bg-muted/60 border-border"
          )}>
            <p className={cn(
              "font-semibold text-[10px] mb-2 uppercase tracking-widest",
              isOfferMsg ? "text-primary" : "text-muted-foreground"
            )}>
              {isOfferMsg ? "💼 Offer" : "📄 Order Details"}
            </p>
            {lines.map((line, i) => (
              <p key={i} className="text-foreground text-xs leading-relaxed">{line}</p>
            ))}
          </div>
        </div>
      );
    }

    // ── Regular bubble ──
    return (
      <div key={msg.id} className={cn("flex gap-2 mb-3", isMe ? "justify-end" : "justify-start")}>
        {!isMe && (
          <Avatar className="h-7 w-7 shrink-0 mt-1">
            <AvatarImage src={activeConv?.otherUserAvatar ?? undefined} />
            <AvatarFallback className="text-[10px] bg-muted">
              {activeConv?.otherUserName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className={cn("max-w-[70%] flex flex-col", isMe ? "items-end" : "items-start")}>
          {msg.image_urls && msg.image_urls.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {msg.image_urls.map((url, i) => (
                <div
                  key={i}
                  className="relative group cursor-pointer rounded-lg overflow-hidden"
                  onClick={() => setLightboxSrc(url)}
                >
                  <img src={url} alt="attachment" className="h-32 w-auto object-cover rounded-lg" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Only show text bubble if there's real text content (not a placeholder) */}
          {msg.content && !isImageOnly && (
            <div className={cn(
              "rounded-2xl px-3 py-2 text-sm leading-relaxed",
              isMe
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            )}>
              {msg.content}
            </div>
          )}
          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
            {format(new Date(msg.created_at), "HH:mm")}
          </span>
        </div>
      </div>
    );
  };

  // ── Filtered conversations ─────────────────────────────────────────────────

  const searchFiltered = conversations.filter(c =>
    search.trim() === "" ||
    c.otherUserName.toLowerCase().includes(search.toLowerCase()) ||
    c.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
    c.jobCategory.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = activeFilter === "all"
    ? searchFiltered
    : searchFiltered.filter(c => c.convType === activeFilter);

  const orders = filtered.filter(c => c.convType === "order");
  const delivered = filtered.filter(c => c.convType === "delivered");
  const quotes = filtered.filter(c => c.convType === "quote");

  // Counts for filter tabs (from search-filtered, ignoring active filter)
  const tabCounts = {
    all: searchFiltered.length,
    order: searchFiltered.filter(c => c.convType === "order").length,
    quote: searchFiltered.filter(c => c.convType === "quote").length,
    delivered: searchFiltered.filter(c => c.convType === "delivered").length,
  };

  // ── Sidebar row ────────────────────────────────────────────────────────────

  const ConvRow = ({ conv }: { conv: ConversationItem }) => {
    const isActive = activeConv?.sessionId === conv.sessionId;
    const cfg = TYPE_CONFIG[conv.convType];
    return (
      <button
        onClick={() => selectConv(conv)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-muted/50 border-l-2",
          isActive
            ? "bg-primary/8 border-l-primary"
            : "border-l-transparent"
        )}
      >
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conv.otherUserAvatar ?? undefined} />
            <AvatarFallback className="text-sm bg-muted">
              {conv.otherUserName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {conv.otherUserOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className={cn("text-sm font-semibold truncate", isActive ? "text-primary" : "text-foreground")}>
              {conv.otherUserName}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {timeLabel(conv.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
              cfg.badgeClass
            )}>
              {cfg.icon}
              {cfg.label}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">{conv.jobTitle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              {conv.lastMessage ?? "No messages yet"}
            </span>
            {conv.unreadCount > 0 && (
              <span className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  // ── Section header ─────────────────────────────────────────────────────────

  const SectionHeader = ({ label, count }: { label: string; count: number }) => (
    <div className="px-4 pt-4 pb-1 flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{count}</span>
    </div>
  );

  // ── Empty chat state ───────────────────────────────────────────────────────

  const EmptyChatPlaceholder = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
        <MessageSquare className="h-9 w-9 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-1">Select a conversation</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Choose a chat from the sidebar to start messaging. All your orders and quotes are in one place.
        </p>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden">
      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className={cn(
        "flex flex-col border-r border-border bg-card/30 w-full md:w-80 lg:w-96 shrink-0",
        showChat && "hidden md:flex"
      )}>
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
          <InboxIcon className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold text-foreground flex-1">Messages</h1>
          {conversations.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
            <Badge variant="default" className="rounded-full">
              {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or order..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-muted/40 border-border/50 h-9 text-sm"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="flex gap-1">
            {([
              { key: "all", label: "All", icon: <LayoutList className="h-3 w-3" /> },
              { key: "order", label: "Active", icon: <ShoppingBag className="h-3 w-3" /> },
              { key: "quote", label: "Quotes", icon: <MessageSquare className="h-3 w-3" /> },
              { key: "delivered", label: "Completed", icon: <CheckCircle2 className="h-3 w-3" /> },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[11px] font-medium transition-all",
                  activeFilter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tabCounts[tab.key] > 0 && (
                  <span className={cn(
                    "rounded-full px-1 text-[9px] font-bold leading-4 min-w-4 text-center",
                    activeFilter === tab.key
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <InboxIcon className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
              <p className="text-xs text-muted-foreground">Post a request or quote on a job to get started.</p>
            </div>
          ) : (
            <>
              {/* When showing "all", use sections; otherwise flat list */}
              {activeFilter === "all" ? (
                <>
                  {orders.length > 0 && (
                    <>
                      <SectionHeader label="Active Orders" count={orders.length} />
                      {orders.map(c => <ConvRow key={c.sessionId} conv={c} />)}
                    </>
                  )}
                  {delivered.length > 0 && (
                    <>
                      <SectionHeader label="Completed" count={delivered.length} />
                      {delivered.map(c => <ConvRow key={c.sessionId} conv={c} />)}
                    </>
                  )}
                  {quotes.length > 0 && (
                    <>
                      <SectionHeader label="Quotes & Offers" count={quotes.length} />
                      {quotes.map(c => <ConvRow key={c.sessionId} conv={c} />)}
                    </>
                  )}
                </>
              ) : (
                <>
                  {filtered.map(c => <ConvRow key={c.sessionId} conv={c} />)}
                </>
              )}
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {search ? `No results for "${search}"` : "Nothing here yet."}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </aside>

      {/* ── CHAT PANEL ──────────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !showChat && "hidden md:flex"
      )}>
        {!activeConv ? (
          <EmptyChatPlaceholder />
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/30 shrink-0">
              {/* Mobile back button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => setShowChat(false)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={activeConv.otherUserAvatar ?? undefined} />
                  <AvatarFallback className="text-sm bg-muted">
                    {activeConv.otherUserName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {activeConv.otherUserOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {activeConv.otherUserName}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0",
                    TYPE_CONFIG[activeConv.convType].badgeClass
                  )}>
                    {TYPE_CONFIG[activeConv.convType].icon}
                    {activeConv.iAmSeller ? "Buyer" : "Expert"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{activeConv.jobTitle}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {activeConv.jobId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => navigate(activeConv.iAmSeller
                      ? `/request/${activeConv.jobId}`
                      : `/order/${activeConv.jobId}`
                    )}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {activeConv.iAmSeller ? "View Request" : "View Order"}
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
              {msgLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
                </div>
              ) : (
                <>
                  {messages.map(renderBubble)}
                  <div ref={bottomRef} />
                </>
              )}
            </ScrollArea>

            {/* Image previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="flex gap-2 px-4 py-2 border-t border-border bg-card/20 flex-wrap">
                {imagePreviewUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-border bg-card/20 shrink-0">
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Textarea
                  placeholder="Type a message…"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="flex-1 min-h-[36px] max-h-32 resize-none text-sm bg-muted/40 border-border/50 rounded-xl py-2 leading-relaxed"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl"
                  onClick={sendMessage}
                  disabled={sending || (!inputText.trim() && imageFiles.length === 0)}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Inbox;
