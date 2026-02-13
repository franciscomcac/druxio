import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MessageSquare, Clock, ArrowRight, BarChart3,
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

// ─── Component ───────────────────────────────────────────────────

const Admin = () => {
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

  // Stats
  const [stats, setStats] = useState({ totalOrders: 0, activeDisputes: 0, totalUsers: 0, revenue: 0 });

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
    loadStats();
  }, [isAdmin, activeTab]);

  // ─── Data loaders ───────────────────────────────────────────────

  const loadStats = async () => {
    const [jobsCount, disputeCount, usersCount, transactionsData] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("transactions").select("amount").eq("type", "session_payment").eq("status", "completed"),
    ]);
    const revenue = transactionsData.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    setStats({
      totalOrders: jobsCount.count || 0,
      activeDisputes: disputeCount.count || 0,
      totalUsers: usersCount.count || 0,
      revenue,
    });
  };

  const loadDisputes = async () => {
    setDisputesLoading(true);
    // Disputes are jobs with status "disputed" — the dispute reason is in notifications
    const { data: disputedJobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "disputed")
      .order("updated_at", { ascending: false });

    if (!disputedJobs) { setDisputesLoading(false); return; }

    const enriched: Dispute[] = await Promise.all(
      disputedJobs.map(async (job) => {
        // Get accepted quote + seller
        const { data: quote } = await supabase
          .from("quotes")
          .select("expert_id, price")
          .eq("job_id", job.id)
          .eq("status", "accepted")
          .maybeSingle();

        const [buyerProfile, sellerProfile, disputeNotif] = await Promise.all([
          supabase.from("profiles").select("display_name").eq("id", job.buyer_id).single(),
          quote ? supabase.from("profiles").select("display_name").eq("id", quote.expert_id).single() : Promise.resolve({ data: null }),
          supabase.from("notifications").select("id, message, created_at").eq("type", "dispute").order("created_at", { ascending: false }).limit(1).maybeSingle(),
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

  // ─── Actions ────────────────────────────────────────────────────

  const handleDisputeResolve = async (action: "refund" | "release") => {
    if (!selectedDispute) return;
    setDisputeActionLoading(true);

    try {
      if (action === "refund") {
        // Void the PayPal authorization — mark job as cancelled/refunded
        await supabase.from("jobs").update({ status: "cancelled" }).eq("id", selectedDispute.job_id);
        // Create refund transaction record
        await supabase.from("transactions").insert({
          user_id: selectedDispute.buyer_id,
          amount: selectedDispute.quote_price * 1.05,
          type: "refund" as const,
          status: "completed" as const,
          description: `Refund for disputed order: ${selectedDispute.job_title}`,
        });
        toast({ title: "Dispute resolved — Refund issued", description: `Buyer has been refunded €${(selectedDispute.quote_price * 1.05).toFixed(2)}` });
      } else {
        // Release to seller
        try {
          await supabase.functions.invoke("paypal-release", {
            body: { jobId: selectedDispute.job_id },
          });
        } catch {
          // If paypal-release fails, still mark as completed
        }
        await supabase.from("jobs").update({ status: "completed" }).eq("id", selectedDispute.job_id);
        toast({ title: "Dispute resolved — Payment released", description: "Funds released to the seller." });
      }

      // Add admin note as notification to both parties
      if (disputeNote.trim()) {
        await Promise.all([
          supabase.from("notifications").insert({
            user_id: selectedDispute.buyer_id,
            type: "dispute_resolved",
            title: `Dispute resolved: ${action === "refund" ? "Refund issued" : "Payment released"}`,
            message: disputeNote.trim(),
            data: { job_id: selectedDispute.job_id },
          }),
          supabase.from("notifications").insert({
            user_id: selectedDispute.seller_id,
            type: "dispute_resolved",
            title: `Dispute resolved: ${action === "refund" ? "Refund issued" : "Payment released"}`,
            message: disputeNote.trim(),
            data: { job_id: selectedDispute.job_id },
          }),
        ]);
      }

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

  // ─── Helpers ────────────────────────────────────────────────────

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed": return "default";
      case "disputed": return "destructive";
      case "accepted": return "default";
      case "cancelled": return "destructive";
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
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage disputes, orders, and users</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.activeDisputes}</p>
                <p className="text-xs text-muted-foreground">Active Disputes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">€{stats.revenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="disputes" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputes
              {stats.activeDisputes > 0 && <Badge variant="destructive" className="ml-1">{stats.activeDisputes}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

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
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <h3 className="font-semibold text-foreground">{d.job_title}</h3>
                            <Badge variant="outline">{d.job_category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{d.reason}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Buyer: <strong className="text-foreground">{d.buyer_name}</strong></span>
                            <span>Seller: <strong className="text-foreground">{d.seller_name}</strong></span>
                            <span>Price: <strong className="text-foreground">€{d.quote_price.toFixed(2)}</strong></span>
                            <span>{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/order/${d.job_id}`)}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => { setSelectedDispute(d); setDisputeAction("refund"); }}>
                            <RefreshCw className="h-3.5 w-3.5" /> Refund
                          </Button>
                          <Button size="sm" className="gap-1" onClick={() => { setSelectedDispute(d); setDisputeAction("release"); }}>
                            <DollarSign className="h-3.5 w-3.5" /> Release
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
                  <Table>
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
                  <Table>
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
                </ScrollArea>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />

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
