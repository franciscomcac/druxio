import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell, MessageSquare, UserPlus, CheckCircle, Clock,
  Wallet, ArrowLeft, Trash2, CheckCheck, Package,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
  data: any;
}

type FilterType = "all" | "unread" | "withdrawal" | "orders" | "messages";

const getIcon = (type: string) => {
  switch (type) {
    case "new_request": return <Bell className="h-5 w-5 text-primary" />;
    case "session_request": return <UserPlus className="h-5 w-5 text-primary" />;
    case "message": return <MessageSquare className="h-5 w-5 text-primary" />;
    case "session_accepted": return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "session_reminder": return <Clock className="h-5 w-5 text-amber-500" />;
    case "withdrawal_completed": return <Wallet className="h-5 w-5 text-green-500" />;
    case "withdrawal_rejected": return <Wallet className="h-5 w-5 text-destructive" />;
    case "order_completed": return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "order_cancelled": return <Package className="h-5 w-5 text-destructive" />;
    case "dispute_raised": return <Bell className="h-5 w-5 text-amber-500" />;
    case "dispute_resolved": return <CheckCircle className="h-5 w-5 text-green-500" />;
    default: return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

const getIconBg = (type: string) => {
  if (["withdrawal_completed", "session_accepted", "order_completed", "dispute_resolved"].includes(type))
    return "bg-green-500/10";
  if (["withdrawal_rejected", "order_cancelled"].includes(type))
    return "bg-destructive/10";
  if (["dispute_raised", "session_reminder"].includes(type))
    return "bg-amber-500/10";
  return "bg-primary/10";
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "orders", label: "Orders" },
  { key: "messages", label: "Messages" },
];

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserId(session.user.id);
      fetchAll(session.user.id);

      const channel = supabase
        .channel("notifications-page")
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();

      channelRef.current = channel;
    };
    init();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [navigate]);

  const fetchAll = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.type === "withdrawal_completed" || n.type === "withdrawal_rejected") {
      navigate("/wallet");
    } else if (n.type === "new_request" && n.data?.job_id) {
      navigate(`/request/${n.data.job_id}`);
    } else if (["order_completed", "order_cancelled", "dispute_raised", "dispute_resolved", "refund_issued"].includes(n.type) && n.data?.job_id) {
      navigate(`/order/${n.data.job_id}`);
    } else if (["session_request", "message", "session_accepted"].includes(n.type) && n.data?.session_id) {
      navigate(`/session/${n.data.session_id}`);
    } else if (n.data?.job_id) {
      navigate(`/order/${n.data.job_id}`);
    }
  };

  const applyFilter = (list: Notification[]) => {
    switch (filter) {
      case "unread": return list.filter(n => !n.is_read);
      case "withdrawal": return list.filter(n => n.type.startsWith("withdrawal"));
      case "orders": return list.filter(n => ["new_request", "order_completed", "order_cancelled", "dispute_raised", "dispute_resolved", "refund_issued"].includes(n.type));
      case "messages": return list.filter(n => ["message", "session_request", "session_accepted", "session_reminder"].includes(n.type));
      default: return list;
    }
  };

  const filtered = applyFilter(notifications);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs">{unreadCount} unread</Badge>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="text-xs"
            >
              {f.label}
              {f.key === "unread" && unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">{unreadCount}</Badge>
              )}
            </Button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card/50">
                <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No notifications</h3>
            <p className="text-muted-foreground text-sm">
              {filter === "unread" ? "You're all caught up!" : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02] ${
                  !n.is_read
                    ? "border-primary/20 bg-primary/[0.03]"
                    : "border-border bg-card/50"
                }`}
              >
                {/* Icon */}
                <div className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center ${getIconBg(n.type)}`}>
                  {getIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => deleteNotification(n.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {n.message && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
