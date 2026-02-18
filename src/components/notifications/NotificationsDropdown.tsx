import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, MessageSquare, UserPlus, CheckCircle, Clock, Loader2, Wallet, ArrowRight } from "lucide-react";
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

const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let userId: string | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      userId = session.user.id;

      fetchNotifications();

      // Subscribe to realtime notifications for this user
      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setup();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    // Remove all notifications from the list and clear the badge
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.type === "withdrawal_completed" || notification.type === "withdrawal_rejected") {
      navigate("/wallet");
    } else if (notification.data?.job_id && ["dispute_raised", "dispute_resolved", "refund_issued", "order_completed", "order_cancelled"].includes(notification.type)) {
      navigate(`/order/${notification.data.job_id}`);
    } else if (notification.type === "new_request" && notification.data?.job_id) {
      navigate(`/request/${notification.data.job_id}`);
    } else if (notification.type === "session_request" && notification.data?.session_id) {
      navigate(`/session/${notification.data.session_id}`);
    } else if (notification.type === "message" && notification.data?.session_id) {
      navigate(`/session/${notification.data.session_id}`);
    } else if (notification.type === "session_accepted" && notification.data?.session_id) {
      navigate(`/session/${notification.data.session_id}`);
    } else if (notification.data?.job_id) {
      navigate(`/order/${notification.data.job_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_request":
        return <Bell className="h-4 w-4 text-primary" />;
      case "session_request":
        return <UserPlus className="h-4 w-4 text-primary" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case "session_accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "session_reminder":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "withdrawal_completed":
        return <Wallet className="h-4 w-4 text-green-500" />;
      case "withdrawal_rejected":
        return <Wallet className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary hover:text-primary/80"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex cursor-pointer gap-3 p-3 ${
                  !notification.is_read ? "bg-accent/50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className={`text-sm leading-tight ${!notification.is_read ? "font-medium" : ""}`}>
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/notifications")}
          >
            View all notifications
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
