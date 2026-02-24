import { useState, useEffect, useRef } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck, AlertTriangle, Package, Users, Search, Loader2,
  CheckCircle2, XCircle, Eye, Ban, RefreshCw, DollarSign,
  MessageSquare, Clock, ArrowRight, BarChart3, Wallet, ArrowDownToLine,
  Headphones, Send, Bot, User, MessageSquarePlus, Star, Trash2,
  Flag, ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────

interface Dispute {
  job_id: string;
  job_title: string;
  job_category: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  seller_name: string;
  reason: string;
  created_at: string;
  quote_price: number;
  notification_id: string;
}

interface OrderRow {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string | null;
  seller_name: string | null;
  price: number | null;
}

interface UserRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
  wallet_balance: number;
  total_sessions: number;
  rating_avg: number;
  created_at: string;
  roles: string[];
}

interface WithdrawalRow {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  method: string;
  paypal_email: string | null;
  crypto_token: string | null;
  crypto_network: string | null;
  crypto_address: string | null;
  status: string;
  admin_notes: string | null;
  transaction_id: string | null;
  created_at: string;
}

interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  role_type: string;
  category: string;
  problem: string;
  status: string;
  created_at: string;
  updated_at: string;
  lastMessage?: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "admin" | "bot";
  content: string;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  user_id: string | null;
  rating: number;
  category: string;
  message: string;
  user_type: string | null;
  email: string | null;
  created_at: string;
}

interface ReportRow {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reported_user_id: string;
  reported_user_name: string;
  reason: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  image_urls: string[] | null;
  is_banned: boolean;
}

// ─── Component ───────────────────────────────────────────────────

const Admin = () => {
  useSEO({ title: "Admin", noIndex: true });
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("disputes");

  // Disputes
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeAction, setDisputeAction] = useState<"refund" | "release" | null>(null);
  const [disputeNote, setDisputeNote] = useState("");
  const [disputeActionLoading, setDisputeActionLoading] = useState(false);

  // Orders
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<string>("");

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalFilter, setWithdrawalFilter] = useState("pending");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRow | null>(null);
  const [withdrawalAction, setWithdrawalAction] = useState<"approve" | "reject" | null>(null);
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const [withdrawalActionLoading, setWithdrawalActionLoading] = useState(false);

  // Support
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportFilter, setSupportFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportMessage[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const supportBottomRef = useRef<HTMLDivElement>(null);

  // Feedback
  const [feedbackItems, setFeedbackItems] = useState<FeedbackRow[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("all");
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState("all");

  // Reports
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsFilter, setReportsFilter] = useState("pending");
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [reportAdminNote, setReportAdminNote] = useState("");
  const [reportActionLoading, setReportActionLoading] = useState(false);
  const [reportSignedUrls, setReportSignedUrls] = useState<string[]>([]);

  // Stats
  const [stats, setStats] = useState({ totalOrders: 0, activeDisputes: 0, totalUsers: 0, revenue: 0, pendingWithdrawals: 0, openSupport: 0, pendingReports: 0 });

  // ─── Auth check ─────────────────────────────────────────────────

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdmin = roles?.some(r => r.role === "admin") || false;
      if (!hasAdmin) {
        toast({ title: "Access denied", description: "Admin privileges required.", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate, toast]);

  // ─── Load data when tab changes ─────────────────────────────────

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "disputes") loadDisputes();
    if (activeTab === "orders") loadOrders();
    if (activeTab === "users") loadUsers();
    if (activeTab === "withdrawals") loadWithdrawals();
    if (activeTab === "support") loadSupportTickets();
    if (activeTab === "feedback") loadFeedback();
    if (activeTab === "reports") loadReports();
    loadStats();
  }, [isAdmin, activeTab]);

  // Get admin's own user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data.user?.id || null));
  }, []);

  // Realtime for selected support ticket
  useEffect(() => {
    if (!selectedTicket) return;
    const ch = supabase
      .channel(`admin-support-${selectedTicket.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `ticket_id=eq.${selectedTicket.id}`,
      }, (payload) => {
        const msg = payload.new as SupportMessage;
        setTicketMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, { ...msg, sender_type: msg.sender_type as "user" | "admin" | "bot" }]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedTicket]);

  // Scroll support chat to bottom (scroll only the chat container, not the page)
  useEffect(() => {
    const el = supportBottomRef.current;
    if (!el) return;
    const container = el.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [ticketMessages]);

  // Reload withdrawals when filter changes
  useEffect(() => {
    if (isAdmin && activeTab === "withdrawals") loadWithdrawals();
  }, [withdrawalFilter]);

  // Reload support when filter changes
  useEffect(() => {
    if (isAdmin && activeTab === "support") loadSupportTickets();
  }, [supportFilter]);

  // Load signed URLs for report images
  useEffect(() => {
    if (!selectedReport?.image_urls?.length) { setReportSignedUrls([]); return; }
    Promise.all(selectedReport.image_urls.map(p => getSignedImageUrl(p))).then(setReportSignedUrls);
  }, [selectedReport]);

  // Reload reports when filter changes
  useEffect(() => {
    if (isAdmin && activeTab === "reports") loadReports();
  }, [reportsFilter]);

  // ─── Data loaders ───────────────────────────────────────────────

  const loadStats = async () => {
    const [jobsCount, disputeCount, usersCount, transactionsData, pendingWdCount, pendingReportsCount] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("transactions").select("amount").eq("type", "session_payment").eq("status", "completed"),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("user_reports" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const revenue = transactionsData.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    setStats({
      totalOrders: jobsCount.count || 0,
      activeDisputes: disputeCount.count || 0,
      totalUsers: usersCount.count || 0,
      revenue,
      pendingWithdrawals: pendingWdCount.count || 0,
      openSupport: 0,
      pendingReports: (pendingReportsCount as any).count || 0,
    });
  };

  const loadDisputes = async () => {
    setDisputesLoading(true);
    const { data: disputedJobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "disputed")
      .order("updated_at", { ascending: false });

    if (!disputedJobs) { setDisputesLoading(false); return; }

    const enriched: Dispute[] = await Promise.all(
      disputedJobs.map(async (job) => {
        const { data: quote } = await supabase
          .from("quotes")
          .select("expert_id, price")
          .eq("job_id", job.id)
          .eq("status", "accepted")
          .maybeSingle();

        const [buyerProfile, sellerProfile, disputeNotif] = await Promise.all([
          supabase.from("profiles").select("display_name").eq("id", job.buyer_id).single(),
          quote ? supabase.from("profiles").select("display_name").eq("id", quote.expert_id).single() : Promise.resolve({ data: null }),
          supabase.from("notifications").select("id, message, created_at").eq("type", "dispute").eq("user_id", job.buyer_id).contains("data", { job_id: job.id }).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        return {
          job_id: job.id,
          job_title: job.title,
          job_category: job.category,
          buyer_id: job.buyer_id,
          buyer_name: buyerProfile.data?.display_name || "Unknown",
          seller_id: quote?.expert_id || "",
          seller_name: sellerProfile.data?.display_name || "Unknown",
          reason: disputeNotif.data?.message || "No reason provided",
          created_at: job.updated_at || job.created_at || "",
          quote_price: quote?.price || 0,
          notification_id: disputeNotif.data?.id || "",
        };
      })
    );

    setDisputes(enriched);
    setDisputesLoading(false);
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (orderFilter !== "all") query = query.eq("status", orderFilter);

    const { data: jobs } = await query;
    if (!jobs) { setOrdersLoading(false); return; }

    const enriched: OrderRow[] = await Promise.all(
      jobs.map(async (job) => {
        const [buyerProfile, acceptedQuote] = await Promise.all([
          supabase.from("profiles").select("display_name").eq("id", job.buyer_id).single(),
          supabase.from("quotes").select("expert_id, price").eq("job_id", job.id).eq("status", "accepted").maybeSingle(),
        ]);

        let sellerName: string | null = null;
        if (acceptedQuote.data?.expert_id) {
          const { data: sp } = await supabase.from("profiles").select("display_name").eq("id", acceptedQuote.data.expert_id).single();
          sellerName = sp?.display_name || null;
        }

        return {
          id: job.id,
          title: job.title,
          category: job.category,
          status: job.status,
          created_at: job.created_at || "",
          buyer_id: job.buyer_id,
          buyer_name: buyerProfile.data?.display_name || "Unknown",
          seller_id: acceptedQuote.data?.expert_id || null,
          seller_name: sellerName,
          price: acceptedQuote.data?.price || null,
        };
      })
    );

    setOrders(enriched);
    setOrdersLoading(false);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_online, wallet_balance, total_sessions, rating_avg, created_at")
      .order("created_at", { ascending: false });

    if (!profiles) { setUsersLoading(false); return; }

    const enriched: UserRow[] = await Promise.all(
      profiles.map(async (p) => {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", p.id);
        return {
          ...p,
          is_online: p.is_online || false,
          wallet_balance: Number(p.wallet_balance) || 0,
          total_sessions: p.total_sessions || 0,
          rating_avg: Number(p.rating_avg) || 0,
          roles: roles?.map(r => r.role) || [],
        };
      })
    );

    setUsers(enriched);
    setUsersLoading(false);
  };

  const loadWithdrawals = async () => {
    setWithdrawalsLoading(true);
    let query = supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (withdrawalFilter !== "all") query = query.eq("status", withdrawalFilter);

    const { data: wds } = await query;
    if (!wds) { setWithdrawalsLoading(false); return; }

    const enriched: WithdrawalRow[] = await Promise.all(
      wds.map(async (wd) => {
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", wd.user_id).single();
        return {
          ...wd,
          user_name: profile?.display_name || "Unknown",
          amount: Number(wd.amount),
        };
      })
    );

    setWithdrawals(enriched);
    setWithdrawalsLoading(false);
  };

  const loadSupportTickets = async () => {
    setSupportLoading(true);
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });
    if (supportFilter !== "all") query = query.eq("status", supportFilter);

    const { data: tickets } = await query;
    if (!tickets) { setSupportLoading(false); return; }

    const enriched: SupportTicket[] = await Promise.all(
      tickets.map(async (t) => {
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", t.user_id).single();
        const { data: lastMsg } = await supabase
          .from("support_messages")
          .select("content")
          .eq("ticket_id", t.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return {
          ...t,
          user_name: profile?.display_name || "Unknown",
          lastMessage: lastMsg?.content,
        };
      })
    );

    setSupportTickets(enriched);
    setSupportLoading(false);
  };

  const loadFeedback = async () => {
    setFeedbackLoading(true);
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setFeedbackItems((data as unknown as FeedbackRow[]) || []);
    setFeedbackLoading(false);
  };

  const deleteFeedback = async (id: string) => {
    await supabase.from("feedback").delete().eq("id", id);
    setFeedbackItems(prev => prev.filter(f => f.id !== id));
    toast({ title: "Feedback deleted" });
  };

  const loadReports = async () => {
    setReportsLoading(true);
    let query = supabase.from("user_reports" as any).select("*").order("created_at", { ascending: false });
    if (reportsFilter !== "all") query = query.eq("status", reportsFilter);

    const { data: rawReports } = await query;
    if (!rawReports) { setReportsLoading(false); return; }

    const enriched: ReportRow[] = await Promise.all(
      (rawReports as any[]).map(async (r) => {
        const [reporterProfile, reportedProfile] = await Promise.all([
          supabase.from("profiles").select("display_name").eq("id", r.reporter_id).single(),
          supabase.from("profiles").select("display_name, is_banned").eq("id", r.reported_user_id).single(),
        ]);
        return {
          ...r,
          reporter_name: reporterProfile.data?.display_name || "Unknown",
          reported_user_name: reportedProfile.data?.display_name || "Unknown",
          is_banned: reportedProfile.data?.is_banned || false,
        };
      })
    );

    setReports(enriched);
    setReportsLoading(false);
  };

  const handleReportAction = async (reportId: string, action: "reviewed" | "dismissed" | "action_taken") => {
    setReportActionLoading(true);
    try {
      await supabase.from("user_reports" as any).update({
        status: action,
        admin_notes: reportAdminNote.trim() || null,
      } as any).eq("id", reportId);

      toast({ title: `Report ${action === "action_taken" ? "actioned" : action}` });
      setSelectedReport(null);
      setReportAdminNote("");
      loadReports();
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setReportActionLoading(false);
  };

  const handleBanUser = async (userId: string, userName: string, ban: boolean) => {
    setReportActionLoading(true);
    try {
      await supabase.from("profiles").update({
        is_banned: ban,
        ban_reason: ban ? (reportAdminNote.trim() || "Banned by admin") : null,
        banned_at: ban ? new Date().toISOString() : null,
      }).eq("id", userId);

      if (selectedReport) {
        await supabase.from("user_reports" as any).update({
          status: "action_taken",
          admin_notes: reportAdminNote.trim() || `User ${ban ? "banned" : "unbanned"} by admin`,
        } as any).eq("id", selectedReport.id);
      }

      // Notify the user
      await supabase.from("notifications").insert({
        user_id: userId,
        type: ban ? "account_banned" : "account_unbanned",
        title: ban ? "Account Suspended" : "Account Reinstated",
        message: ban
          ? "Your account has been suspended due to violations of our community guidelines. Contact support if you believe this is an error."
          : "Your account has been reinstated. Please adhere to our community guidelines.",
      });

      toast({ title: ban ? `${userName} has been banned` : `${userName} has been unbanned` });
      setSelectedReport(null);
      setReportAdminNote("");
      loadReports();
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setReportActionLoading(false);
  };

  const getSignedImageUrl = async (path: string): Promise<string> => {
    const { data } = await supabase.storage.from("report-images").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  const openSupportTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at");
    setTicketMessages((msgs || []).map(m => ({ ...m, sender_type: m.sender_type as "user" | "admin" | "bot" })));
    if (ticket.status === "waiting") {
      await supabase.from("support_tickets").update({ status: "live" }).eq("id", ticket.id);
    }
  };

  const sendAdminReply = async () => {
    if (!adminReply.trim() || !selectedTicket || !adminId || sendingReply) return;
    setSendingReply(true);
    const content = adminReply.trim();
    setAdminReply("");
    await supabase.from("support_messages").insert({
      ticket_id: selectedTicket.id,
      sender_id: adminId,
      sender_type: "admin",
      content,
    });
    setSendingReply(false);
  };

  const closeTicket = async (ticketId: string) => {
    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", ticketId);
    toast({ title: "Ticket closed" });
    setSelectedTicket(null);
    setTicketMessages([]);
    loadSupportTickets();
  };

  // ─── Actions ────────────────────────────────────────────────────


  const handleDisputeResolve = async (action: "refund" | "release") => {
    if (!selectedDispute) return;
    setDisputeActionLoading(true);

    try {
      if (action === "refund") {
        await supabase.from("jobs").update({ status: "cancelled" }).eq("id", selectedDispute.job_id);
        await supabase.from("transactions").insert({
          user_id: selectedDispute.buyer_id,
          amount: selectedDispute.quote_price * 1.05,
          type: "refund" as const,
          status: "completed" as const,
          description: `Refund for disputed order: ${selectedDispute.job_title}`,
        });
        toast({ title: "Dispute resolved — Refund issued", description: `Buyer has been refunded €${(selectedDispute.quote_price * 1.05).toFixed(2)}` });
      } else {
        try {
          await supabase.functions.invoke("escrow-release", {
            body: { jobId: selectedDispute.job_id },
          });
        } catch {
          // If escrow-release fails, still mark as completed
        }
        await supabase.from("jobs").update({ status: "completed" }).eq("id", selectedDispute.job_id);
        toast({ title: "Dispute resolved — Payment released", description: "Funds released to the seller." });
      }

      // Always notify both parties about dispute resolution
      const resolveTitle = action === "refund" ? "Refund issued" : "Payment released";
      const resolveMessage = disputeNote.trim()
        ? disputeNote.trim()
        : action === "refund"
          ? `Your dispute for "${selectedDispute.job_title}" has been resolved. A refund of €${(selectedDispute.quote_price * 1.05).toFixed(2)} has been issued to the buyer.`
          : `Your dispute for "${selectedDispute.job_title}" has been resolved. Payment has been released to the seller.`;

      await Promise.all([
        supabase.from("notifications").insert({
          user_id: selectedDispute.buyer_id,
          type: action === "refund" ? "refund_issued" : "dispute_resolved",
          title: `Dispute resolved: ${resolveTitle}`,
          message: resolveMessage,
          data: { job_id: selectedDispute.job_id },
        }),
        supabase.from("notifications").insert({
          user_id: selectedDispute.seller_id,
          type: action === "refund" ? "refund_issued" : "dispute_resolved",
          title: `Dispute resolved: ${resolveTitle}`,
          message: resolveMessage,
          data: { job_id: selectedDispute.job_id },
        }),
      ]);

      setSelectedDispute(null);
      setDisputeNote("");
      setDisputeAction(null);
      loadDisputes();
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDisputeActionLoading(false);
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
    await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId);
    toast({ title: "Order updated", description: `Status changed to ${newStatus}` });
    loadOrders();
    loadStats();
  };

  const handleAddRole = async (userId: string, role: string) => {
    if (!role) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: role as any,
    });
    if (error) {
      if (error.message.includes("duplicate")) {
        toast({ title: "Role already assigned", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Role added" });
      loadUsers();
    }
    setRoleToAdd("");
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    toast({ title: "Role removed" });
    loadUsers();
  };

  const handleUpdateWallet = async (userId: string, amount: number) => {
    await supabase.from("profiles").update({ wallet_balance: amount }).eq("id", userId);
    toast({ title: "Wallet updated" });
    loadUsers();
  };

  const handleWithdrawalAction = async (action: "approve" | "reject") => {
    if (!selectedWithdrawal) return;
    setWithdrawalActionLoading(true);

    try {
      if (action === "approve") {
        // Mark withdrawal as completed
        await supabase.from("withdrawals").update({
          status: "completed",
          admin_notes: withdrawalNote.trim() || "Manually approved by admin",
        }).eq("id", selectedWithdrawal.id);

        // Mark transaction as completed
        if (selectedWithdrawal.transaction_id) {
          await supabase.from("transactions").update({
            status: "completed" as const,
          }).eq("id", selectedWithdrawal.transaction_id);
        }

        // Notify user
        await supabase.from("notifications").insert({
          user_id: selectedWithdrawal.user_id,
          type: "withdrawal_completed",
          title: "Withdrawal Completed",
          message: `Your €${selectedWithdrawal.amount.toFixed(2)} withdrawal via ${selectedWithdrawal.method} has been processed.`,
          data: { withdrawal_id: selectedWithdrawal.id },
        });

        toast({ title: "Withdrawal approved", description: `€${selectedWithdrawal.amount.toFixed(2)} marked as completed.` });
      } else {
        // Mark withdrawal as failed
        await supabase.from("withdrawals").update({
          status: "failed",
          admin_notes: withdrawalNote.trim() || "Rejected by admin",
        }).eq("id", selectedWithdrawal.id);

        // Mark transaction as failed
        if (selectedWithdrawal.transaction_id) {
          await supabase.from("transactions").update({
            status: "failed" as const,
          }).eq("id", selectedWithdrawal.transaction_id);
        }

        // Refund wallet balance
        const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", selectedWithdrawal.user_id).single();
        if (profile) {
          await supabase.from("profiles").update({
            wallet_balance: (Number(profile.wallet_balance) || 0) + selectedWithdrawal.amount,
          }).eq("id", selectedWithdrawal.user_id);
        }

        // Notify user
        await supabase.from("notifications").insert({
          user_id: selectedWithdrawal.user_id,
          type: "withdrawal_rejected",
          title: "Withdrawal Rejected",
          message: `Your €${selectedWithdrawal.amount.toFixed(2)} withdrawal has been rejected. The funds have been returned to your wallet.${withdrawalNote.trim() ? ` Reason: ${withdrawalNote.trim()}` : ""}`,
          data: { withdrawal_id: selectedWithdrawal.id },
        });

        toast({ title: "Withdrawal rejected", description: "Funds returned to user's wallet." });
      }

      setSelectedWithdrawal(null);
      setWithdrawalAction(null);
      setWithdrawalNote("");
      loadWithdrawals();
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setWithdrawalActionLoading(false);
  };

  // ─── Helpers ────────────────────────────────────────────────────

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed": return "default";
      case "disputed": return "destructive";
      case "accepted": return "default";
      case "cancelled": case "failed": return "destructive";
      default: return "secondary";
    }
  };

  const filteredOrders = orders.filter(o =>
    !orderSearch || o.title.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.buyer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
    (o.seller_name || "").toLowerCase().includes(orderSearch.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    !userSearch || (u.display_name || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
        <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 max-w-7xl">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage disputes, orders, users, and withdrawals</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.activeDisputes}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Disputes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">€{stats.revenue.toFixed(0)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Revenue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.pendingWithdrawals}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Withdrawals</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="disputes" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Disputes</span>
                <span className="sm:hidden">Disp.</span>
                {stats.activeDisputes > 0 && <Badge variant="destructive" className="ml-0.5 text-[9px] h-4 px-1">{stats.activeDisputes}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                <Package className="h-3.5 w-3.5" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                <Users className="h-3.5 w-3.5" />
                Users
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Withdrawals</span>
                <span className="sm:hidden">WD</span>
                {stats.pendingWithdrawals > 0 && <Badge variant="destructive" className="ml-0.5 text-[9px] h-4 px-1">{stats.pendingWithdrawals}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="support" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                <Headphones className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Support</span>
                <span className="sm:hidden">Help</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                <MessageSquarePlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Feedback</span>
                <span className="sm:hidden">FB</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reports</span>
                <span className="sm:hidden">Rep.</span>
                {stats.pendingReports > 0 && <Badge variant="destructive" className="ml-0.5 text-[9px] h-4 px-1">{stats.pendingReports}</Badge>}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ═══ DISPUTES TAB ═══ */}
          <TabsContent value="disputes">
            {disputesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : disputes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-primary/40" />
                  <p className="font-semibold text-foreground">No active disputes</p>
                  <p className="text-sm">All disputes have been resolved.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {disputes.map((d) => (
                  <Card key={d.job_id} className="hover:border-primary/30 transition-colors">
                     <CardContent className="p-3 sm:p-5">
                       <div className="space-y-3">
                         <div>
                           <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                             <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                             <h3 className="font-semibold text-foreground text-sm">{d.job_title}</h3>
                             <Badge variant="outline" className="text-[10px]">{d.job_category}</Badge>
                           </div>
                           <p className="text-xs sm:text-sm text-muted-foreground mb-2">{d.reason}</p>
                           <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                             <span>Buyer: <strong className="text-foreground">{d.buyer_name}</strong></span>
                             <span>Seller: <strong className="text-foreground">{d.seller_name}</strong></span>
                             <span>€{d.quote_price.toFixed(2)}</span>
                             <span>{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                           </div>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => navigate(`/order/${d.job_id}`)}>
                             <Eye className="h-3 w-3" /> View
                           </Button>
                           <Button size="sm" variant="outline" className="gap-1 text-xs h-8 text-destructive hover:bg-destructive/10" onClick={() => { setSelectedDispute(d); setDisputeAction("refund"); }}>
                             <RefreshCw className="h-3 w-3" /> Refund
                           </Button>
                           <Button size="sm" className="gap-1 text-xs h-8" onClick={() => { setSelectedDispute(d); setDisputeAction("release"); }}>
                             <DollarSign className="h-3 w-3" /> Release
                           </Button>
                         </div>
                       </div>
                     </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ ORDERS TAB ═══ */}
          <TabsContent value="orders">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={orderFilter} onValueChange={(v) => { setOrderFilter(v); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadOrders}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {ordersLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <ScrollArea className="max-h-[600px]">
                 <div className="overflow-x-auto">
                   <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground text-sm">{order.title}</p>
                                <p className="text-xs text-muted-foreground">{order.category}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{order.buyer_name}</TableCell>
                            <TableCell className="text-sm">{order.seller_name || "—"}</TableCell>
                            <TableCell className="text-sm font-medium">{order.price ? `€${order.price.toFixed(2)}` : "—"}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {order.created_at ? format(new Date(order.created_at), "MMM d, yyyy") : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={() => navigate(`/order/${order.id}`)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {order.status !== "completed" && order.status !== "cancelled" && (
                                  <Select onValueChange={(v) => handleUpdateJobStatus(order.id, v)}>
                                    <SelectTrigger className="h-8 w-28 text-xs">
                                      <SelectValue placeholder="Change..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="accepted">Accepted</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                   </Table>
                 </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>

          {/* ═══ USERS TAB ═══ */}
          <TabsContent value="users">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadUsers}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {usersLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <ScrollArea className="max-h-[600px]">
                  <div className="overflow-x-auto">
                   <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {(user.display_name || "U").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm text-foreground">{user.display_name || "Unnamed"}</p>
                                  <p className="text-xs text-muted-foreground">{user.is_online ? "Online" : "Offline"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map(r => (
                                  <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-xs">
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">€{user.wallet_balance.toFixed(2)}</TableCell>
                            <TableCell className="text-sm">{user.total_sessions}</TableCell>
                            <TableCell className="text-sm">{user.rating_avg > 0 ? user.rating_avg.toFixed(1) : "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(user.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => setSelectedUser(user)}>
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                   </Table>
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>

          {/* ═══ WITHDRAWALS TAB ═══ */}
          <TabsContent value="withdrawals">
            <div className="flex items-center gap-3 mb-4">
              <Select value={withdrawalFilter} onValueChange={setWithdrawalFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadWithdrawals}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {withdrawalsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <ScrollArea className="max-h-[600px]">
                  <div className="overflow-x-auto">
                   <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary/40" />
                            No withdrawals found
                          </TableCell>
                        </TableRow>
                      ) : (
                        withdrawals.map((wd) => (
                          <TableRow key={wd.id}>
                            <TableCell className="text-sm font-medium text-foreground">{wd.user_name}</TableCell>
                            <TableCell className="text-sm font-semibold">€{wd.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{wd.method}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {wd.method === "paypal" ? wd.paypal_email : `${wd.crypto_token} (${wd.crypto_network}): ${wd.crypto_address?.slice(0, 12)}...`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(wd.status)} className="capitalize">{wd.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {wd.admin_notes || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(wd.created_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="text-right">
                              {wd.status === "pending" ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="sm" className="gap-1" onClick={() => { setSelectedWithdrawal(wd); setWithdrawalAction("approve"); }}>
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => { setSelectedWithdrawal(wd); setWithdrawalAction("reject"); }}>
                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                   </Table>
                  </div>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>

          {/* ═══ SUPPORT TAB ═══ */}
          <TabsContent value="support">
            <div className="flex flex-col md:flex-row gap-4 h-[600px]">
              {/* Ticket List */}
              <div className="w-full md:w-72 shrink-0 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Select value={supportFilter} onValueChange={setSupportFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={loadSupportTickets}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="flex-1 border border-border rounded-lg overflow-hidden">
                  {supportLoading ? (
                    <div className="p-4 space-y-3">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : supportTickets.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      <Headphones className="h-8 w-8 mx-auto mb-2 text-primary/40" />
                      No support tickets
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {supportTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={() => openSupportTicket(ticket)}
                          className={cn(
                            "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                            selectedTicket?.id === ticket.id && "bg-primary/5 border-l-2 border-primary"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground truncate">{ticket.user_name}</span>
                            <Badge
                              variant={ticket.status === "waiting" ? "destructive" : ticket.status === "live" ? "default" : "secondary"}
                              className="text-[10px] shrink-0"
                            >
                              {ticket.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{ticket.problem}</p>
                          {ticket.lastMessage && (
                            <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{ticket.lastMessage}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/50 mt-1">
                            {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Chat Panel */}
              <div className="flex-1 border border-border rounded-lg flex flex-col overflow-hidden">
                {!selectedTicket ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 text-primary/30" />
                      <p className="text-sm font-medium text-foreground">Select a ticket</p>
                      <p className="text-xs">Choose a conversation from the left to start replying</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/60 shrink-0">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedTicket.user_name}</p>
                        <p className="text-xs text-muted-foreground">{selectedTicket.category} · {selectedTicket.problem}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">{selectedTicket.role_type}</Badge>
                        {selectedTicket.status !== "closed" && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => closeTicket(selectedTicket.id)}>
                            Close Ticket
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 px-4 py-3">
                      <div className="space-y-3">
                        {ticketMessages.map((msg) => {
                          const isAdmin = msg.sender_type === "admin";
                          const isBot = msg.sender_type === "bot";
                          return (
                            <div key={msg.id} className={cn("flex gap-2", isAdmin ? "flex-row-reverse" : "flex-row")}>
                              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                <AvatarFallback className={cn(
                                  "text-[10px] font-bold",
                                  isAdmin ? "bg-primary/20 text-primary" : isBot ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"
                                )}>
                                  {isAdmin ? "A" : isBot ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                </AvatarFallback>
                              </Avatar>
                              <div className={cn(
                                "max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                                isAdmin ? "bg-primary text-primary-foreground rounded-tr-sm" : isBot ? "bg-muted/60 text-foreground rounded-tl-sm border border-border/50" : "bg-secondary text-secondary-foreground rounded-tl-sm"
                              )}>
                                {!isAdmin && !isBot && <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{selectedTicket.user_name}</p>}
                                {msg.content}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={supportBottomRef} />
                      </div>
                    </ScrollArea>

                    {/* Reply Input */}
                    {selectedTicket.status !== "closed" ? (
                      <div className="px-3 pb-3 pt-2 border-t border-border shrink-0 flex gap-2">
                        <Input
                          placeholder="Type a reply..."
                          value={adminReply}
                          onChange={e => setAdminReply(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAdminReply(); } }}
                          className="h-9 text-sm"
                          disabled={sendingReply}
                        />
                        <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendAdminReply} disabled={sendingReply || !adminReply.trim()}>
                          {sendingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    ) : (
                      <div className="px-4 py-3 border-t border-border text-center text-xs text-muted-foreground shrink-0">
                        This ticket is closed
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══ FEEDBACK TAB ═══ */}
          <TabsContent value="feedback">
            {feedbackLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary bar */}
                {feedbackItems.length > 0 && (() => {
                  const avg = feedbackItems.reduce((s, f) => s + f.rating, 0) / feedbackItems.length;
                  return (
                    <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary fill-primary" />
                        <span className="text-sm font-semibold text-foreground">{avg.toFixed(1)} avg rating</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{feedbackItems.length} submission{feedbackItems.length !== 1 ? "s" : ""}</span>
                      <div className="flex items-center gap-2 ml-auto">
                        <Select value={feedbackRatingFilter} onValueChange={setFeedbackRatingFilter}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue placeholder="All ratings" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All ratings</SelectItem>
                            <SelectItem value="5">★★★★★ (5)</SelectItem>
                            <SelectItem value="4">★★★★ (4)</SelectItem>
                            <SelectItem value="3">★★★ (3)</SelectItem>
                            <SelectItem value="2">★★ (2)</SelectItem>
                            <SelectItem value="1">★ (1)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={feedbackCategoryFilter} onValueChange={setFeedbackCategoryFilter}>
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            <SelectItem value="posting_request">Posting a request</SelectItem>
                            <SelectItem value="finding_expert">Finding an expert</SelectItem>
                            <SelectItem value="payments">Payments & wallet</SelectItem>
                            <SelectItem value="mobile">Mobile experience</SelectItem>
                            <SelectItem value="expert_tools">Expert tools</SelectItem>
                            <SelectItem value="search">Search & filters</SelectItem>
                            <SelectItem value="inbox">Inbox & chat</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })()}

                {/* Feedback list */}
                {feedbackItems
                  .filter(f => feedbackRatingFilter === "all" || String(f.rating) === feedbackRatingFilter)
                  .filter(f => feedbackCategoryFilter === "all" || f.category === feedbackCategoryFilter)
                  .length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <MessageSquarePlus className="h-12 w-12 mx-auto mb-3 text-primary/40" />
                      <p className="font-semibold text-foreground">No feedback yet</p>
                      <p className="text-sm">Submissions will appear here once users share their thoughts.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {feedbackItems
                      .filter(f => feedbackRatingFilter === "all" || String(f.rating) === feedbackRatingFilter)
                      .filter(f => feedbackCategoryFilter === "all" || f.category === feedbackCategoryFilter)
                      .map(f => (
                        <Card key={f.id} className="hover:border-primary/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {/* Stars */}
                                  <div className="flex">
                                    {[1,2,3,4,5].map(n => (
                                      <Star key={n} className={`h-3.5 w-3.5 ${n <= f.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                                    ))}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      f.rating >= 4 ? "border-primary/40 text-primary" :
                                      f.rating === 3 ? "border-muted-foreground/40" :
                                      "border-destructive/40 text-destructive"
                                    }
                                  >
                                    {f.rating >= 4 ? "Positive" : f.rating === 3 ? "Neutral" : "Critical"}
                                  </Badge>
                                  {f.user_type && (
                                    <Badge variant="secondary" className="text-xs">{f.user_type}</Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {f.category.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                                <p className="text-sm text-foreground mb-1">{f.message}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {f.email && <span>📧 {f.email}</span>}
                                  <span>{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteFeedback(f.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ═══ REPORTS TAB ═══ */}
          <TabsContent value="reports">
            <div className="flex items-center gap-3 mb-4">
              <Select value={reportsFilter} onValueChange={setReportsFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="action_taken">Action Taken</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadReports}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>

            {reportsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-primary/40" />
                  <p className="font-semibold text-foreground">No reports</p>
                  <p className="text-sm">No user reports matching this filter.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <Card key={r.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelectedReport(r); setReportAdminNote(r.admin_notes || ""); }}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-destructive" />
                            <span className="font-medium text-foreground">{r.reported_user_name}</span>
                            <Badge variant={r.status === "pending" ? "destructive" : r.status === "action_taken" ? "default" : "secondary"}>
                              {r.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Reported by <span className="font-medium">{r.reporter_name}</span> — {r.reason.replace("_", " ")}
                          </p>
                          {r.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>

        {/* ═══ REPORT DETAIL DIALOG ═══ */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Report Details
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Reported User</p>
                    <p className="font-medium text-foreground">
                      {selectedReport.reported_user_name}
                      {selectedReport.is_banned && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">BANNED</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reporter</p>
                    <p className="font-medium text-foreground">{selectedReport.reporter_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium text-foreground capitalize">{selectedReport.reason.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={selectedReport.status === "pending" ? "destructive" : "secondary"}>{selectedReport.status}</Badge>
                  </div>
                </div>

                {selectedReport.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">{selectedReport.description}</p>
                  </div>
                )}

                {/* Evidence images */}
                {reportSignedUrls.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Evidence ({reportSignedUrls.length} image{reportSignedUrls.length > 1 ? "s" : ""})</p>
                    <div className="grid grid-cols-4 gap-2">
                      {reportSignedUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition-colors">
                          <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="report-admin-note">Admin Notes</Label>
                  <Textarea
                    id="report-admin-note"
                    value={reportAdminNote}
                    onChange={(e) => setReportAdminNote(e.target.value)}
                    placeholder="Add notes about the action taken..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={reportActionLoading}
                    onClick={() => handleReportAction(selectedReport.id, "action_taken")}
                  >
                    {reportActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                    Take Action
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={reportActionLoading}
                    onClick={() => handleReportAction(selectedReport.id, "reviewed")}
                  >
                    <Eye className="h-4 w-4 mr-1" /> Mark Reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reportActionLoading}
                    onClick={() => handleReportAction(selectedReport.id, "dismissed")}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Dismiss
                  </Button>
                </div>

                {/* Ban / Unban section */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  {selectedReport.is_banned ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reportActionLoading}
                      onClick={() => handleBanUser(selectedReport.reported_user_id, selectedReport.reported_user_name, false)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Unban User
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={reportActionLoading}
                      onClick={() => handleBanUser(selectedReport.reported_user_id, selectedReport.reported_user_name, true)}
                    >
                      <Ban className="h-4 w-4 mr-1" /> Ban User
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/mentor/${selectedReport.reported_user_id}`, "_blank")}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View Profile
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      

      {/* ═══ Dispute Resolution Dialog ═══ */}
      <Dialog open={!!disputeAction && !!selectedDispute} onOpenChange={() => { setDisputeAction(null); setSelectedDispute(null); setDisputeNote(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {disputeAction === "refund" ? (
                <><RefreshCw className="h-5 w-5 text-destructive" /> Issue Refund</>
              ) : (
                <><DollarSign className="h-5 w-5 text-primary" /> Release Payment</>
              )}
            </DialogTitle>
            <DialogDescription>
              {disputeAction === "refund"
                ? `Refund €${((selectedDispute?.quote_price || 0) * 1.05).toFixed(2)} to the buyer and cancel the order.`
                : `Release €${(selectedDispute?.quote_price || 0).toFixed(2)} to the seller and complete the order.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
              <p><strong>Order:</strong> {selectedDispute?.job_title}</p>
              <p><strong>Buyer:</strong> {selectedDispute?.buyer_name}</p>
              <p><strong>Seller:</strong> {selectedDispute?.seller_name}</p>
              <p><strong>Reason:</strong> {selectedDispute?.reason}</p>
            </div>
            <Textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="Add a note to both parties (optional)..."
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDisputeAction(null); setSelectedDispute(null); }} disabled={disputeActionLoading}>
              Cancel
            </Button>
            <Button
              variant={disputeAction === "refund" ? "destructive" : "default"}
              onClick={() => disputeAction && handleDisputeResolve(disputeAction)}
              disabled={disputeActionLoading}
              className="gap-2"
            >
              {disputeActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {disputeAction === "refund" ? "Confirm Refund" : "Release Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Withdrawal Action Dialog ═══ */}
      <Dialog open={!!withdrawalAction && !!selectedWithdrawal} onOpenChange={() => { setWithdrawalAction(null); setSelectedWithdrawal(null); setWithdrawalNote(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {withdrawalAction === "approve" ? (
                <><CheckCircle2 className="h-5 w-5 text-primary" /> Approve Withdrawal</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> Reject Withdrawal</>
              )}
            </DialogTitle>
            <DialogDescription>
              {withdrawalAction === "approve"
                ? "Mark this withdrawal as completed. Make sure you've sent the funds externally first."
                : "Reject this withdrawal and return funds to the user's wallet."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
              <p><strong>User:</strong> {selectedWithdrawal?.user_name}</p>
              <p><strong>Amount:</strong> €{selectedWithdrawal?.amount.toFixed(2)}</p>
              <p><strong>Method:</strong> {selectedWithdrawal?.method}</p>
              <p><strong>Destination:</strong> {selectedWithdrawal?.method === "paypal"
                ? selectedWithdrawal?.paypal_email
                : `${selectedWithdrawal?.crypto_token} (${selectedWithdrawal?.crypto_network}): ${selectedWithdrawal?.crypto_address}`}</p>
              {selectedWithdrawal?.admin_notes && (
                <p><strong>Existing notes:</strong> {selectedWithdrawal.admin_notes}</p>
              )}
            </div>
            <Textarea
              value={withdrawalNote}
              onChange={(e) => setWithdrawalNote(e.target.value)}
              placeholder={withdrawalAction === "approve" ? "Add a note (optional)..." : "Reason for rejection (optional)..."}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setWithdrawalAction(null); setSelectedWithdrawal(null); setWithdrawalNote(""); }} disabled={withdrawalActionLoading}>
              Cancel
            </Button>
            <Button
              variant={withdrawalAction === "reject" ? "destructive" : "default"}
              onClick={() => withdrawalAction && handleWithdrawalAction(withdrawalAction)}
              disabled={withdrawalActionLoading}
              className="gap-2"
            >
              {withdrawalActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {withdrawalAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ User Management Dialog ═══ */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
            <DialogDescription>{selectedUser?.display_name || "User"}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* Current roles */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles.map(r => (
                    <Badge key={r} variant="secondary" className="gap-1 pr-1">
                      {r}
                      <button
                        onClick={() => handleRemoveRole(selectedUser.id, r)}
                        className="ml-1 hover:text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Add role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="mentee">Mentee</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => handleAddRole(selectedUser.id, roleToAdd)} disabled={!roleToAdd}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Wallet */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Wallet Balance</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    defaultValue={selectedUser.wallet_balance}
                    id="wallet-input"
                    step="0.01"
                  />
                  <Button size="sm" onClick={() => {
                    const input = document.getElementById("wallet-input") as HTMLInputElement;
                    handleUpdateWallet(selectedUser.id, parseFloat(input.value) || 0);
                  }}>
                    Update
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Sessions: {selectedUser.total_sessions}</p>
                <p>Rating: {selectedUser.rating_avg > 0 ? selectedUser.rating_avg.toFixed(1) : "N/A"}</p>
                <p>Joined: {format(new Date(selectedUser.created_at), "PPP")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
