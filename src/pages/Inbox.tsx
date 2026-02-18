import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play,
  User,
  Calendar,
  ArrowRight,
  Inbox as InboxIcon,
  AlertCircle,
  ShoppingCart,
  Store,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  status: string;
  created_at: string;
  start_time: string | null;
  issue_description: string | null;
  categories: string[] | null;
  session_type: string | null;
  mentee_id: string;
  mentor_id: string;
  price: number | null;
  mentee_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    rating_avg: number | null;
  };
  mentor_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    rating_avg: number | null;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count?: number;
  linked_job_id?: string | null; // job linked via quotes for order navigation
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  accepted: { label: "Accepted", icon: <CheckCircle2 className="h-3 w-3" />, variant: "default" },
  live: { label: "Live", icon: <Play className="h-3 w-3" />, variant: "default" },
  completed: { label: "Completed", icon: <CheckCircle2 className="h-3 w-3" />, variant: "outline" },
  cancelled: { label: "Cancelled", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
};

const Inbox = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMentor, setIsMentor] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const fetchUserAndSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);

    // Check if user is a mentor
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const hasMentorRole = roles?.some(r => r.role === "mentor") || false;
    setIsMentor(hasMentorRole);

    // Fetch sessions
    const { data: sessionsData, error } = await supabase
      .from("sessions")
      .select("*")
      .or(`mentee_id.eq.${user.id},mentor_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error);
      setLoading(false);
      return;
    }

    // Only show sessions linked to paid/accepted orders
    const { data: acceptedQuotes } = await supabase
      .from("quotes")
      .select("expert_id, job_id, status")
      .eq("status", "accepted");

    const validPairs = new Set<string>();
    const jobIdMap = new Map<string, string>();
    if (acceptedQuotes) {
      for (const q of acceptedQuotes) {
        const { data: jobData } = await supabase
          .from("jobs")
          .select("id, buyer_id")
          .eq("id", q.job_id)
          .single();
        if (jobData) {
          const key = `${q.expert_id}-${jobData.buyer_id}`;
          validPairs.add(key);
          jobIdMap.set(key, jobData.id);
        }
      }
    }

    const paidSessions = (sessionsData || []).filter(s => {
      const key = `${s.mentor_id}-${s.mentee_id}`;
      return validPairs.has(key);
    });

    const enrichedSessions = await Promise.all(
      paidSessions.map(async (session) => {
        const [menteeProfile, mentorProfile, lastMessage, unreadMessages] = await Promise.all([
          supabase.from("profiles").select("display_name, avatar_url, rating_avg").eq("id", session.mentee_id).single(),
          supabase.from("profiles").select("display_name, avatar_url, rating_avg").eq("id", session.mentor_id).single(),
          supabase.from("messages").select("content, created_at").eq("session_id", session.id).order("created_at", { ascending: false }).limit(1).single(),
          supabase.from("messages").select("id", { count: "exact" }).eq("session_id", session.id).eq("is_read", false).neq("sender_id", user.id),
        ]);

        const pairKey = `${session.mentor_id}-${session.mentee_id}`;
        const linkedJobId = jobIdMap.get(pairKey) || null;

        return {
          ...session,
          mentee_profile: menteeProfile.data,
          mentor_profile: mentorProfile.data,
          last_message: lastMessage.data,
          unread_count: unreadMessages.count || 0,
          linked_job_id: linkedJobId,
        };
      })
    );

    setSessions(enrichedSessions);
    setLoading(false);
  };

  useEffect(() => {
    fetchUserAndSessions();
  }, [navigate]);

  // Realtime: refetch on session or quote changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        fetchUserAndSessions();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes" }, () => {
        fetchUserAndSessions();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchUserAndSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const filterSessions = (status: string) => {
    if (status === "active") {
      return sessions.filter(s => ["pending", "accepted", "live"].includes(s.status || ""));
    }
    if (status === "completed") {
      return sessions.filter(s => s.status === "completed");
    }
    return sessions;
  };

  const splitByRole = (filtered: Session[]) => {
    const selling = filtered.filter(s => s.mentor_id === userId);
    const buying = filtered.filter(s => s.mentee_id === userId);
    return { selling, buying };
  };

  const getOtherParticipant = (session: Session) => {
    const iAmMentor = session.mentor_id === userId;
    if (iAmMentor) {
      return {
        name: session.mentee_profile?.display_name || "Buyer",
        avatar: session.mentee_profile?.avatar_url,
        role: "Buyer",
        rating: session.mentee_profile?.rating_avg,
      };
    }
    return {
      name: session.mentor_profile?.display_name || "Seller",
      avatar: session.mentor_profile?.avatar_url,
      role: "Seller",
      rating: session.mentor_profile?.rating_avg,
    };
  };

  const SessionCard = ({ session }: { session: Session }) => {
    const other = getOtherParticipant(session);
    const status = statusConfig[session.status || "pending"];

    return (
      <Card 
        className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 bg-card/50 backdrop-blur-sm"
        onClick={() => session.linked_job_id ? navigate(`/order/${session.linked_job_id}`, { state: { from: "/inbox" } }) : navigate(`/session/${session.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarImage src={other.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {other.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {session.status === "live" && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">{other.name}</h3>
                  <span className="text-xs text-muted-foreground">• {other.role}</span>
                  {other.rating ? (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      {other.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <Badge variant={status.variant} className="gap-1 shrink-0">
                  {status.icon}
                  {status.label}
                </Badge>
              </div>

              {/* Issue description */}
              {session.issue_description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                  {session.issue_description}
                </p>
              )}

              {/* Categories */}
              {session.categories && session.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {session.categories.slice(0, 3).map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs font-normal">
                      {cat}
                    </Badge>
                  ))}
                  {session.categories.length > 3 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      +{session.categories.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Last message & time */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1 truncate">
                  {session.last_message ? (
                    <>
                      <MessageSquare className="h-3 w-3" />
                      <span className="truncate">{session.last_message.content}</span>
                    </>
                  ) : (
                    <span className="italic">No messages yet</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {session.unread_count && session.unread_count > 0 ? (
                    <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {session.unread_count}
                    </span>
                  ) : null}
                  <span>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center" />
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ type }: { type: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <InboxIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">No {type} sessions</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        {isMentor 
          ? "When mentees request your help, their sessions will appear here."
          : "Start a session with a mentor to see your conversations here."}
      </p>
      {!isMentor && (
        <Button className="mt-4" onClick={() => navigate("/search")}>
          Find a Mentor
        </Button>
      )}
    </div>
  );

  const GroupedSessionList = ({ filtered }: { filtered: Session[] }) => {
    const { selling, buying } = splitByRole(filtered);
    if (filtered.length === 0) return null;
    return (
      <div className="space-y-6">
        {selling.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Store className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Selling</h3>
              <Badge variant="secondary" className="text-xs">{selling.length}</Badge>
            </div>
            <div className="space-y-3">
              {selling.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </div>
        )}
        {buying.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Buying</h3>
              <Badge variant="secondary" className="text-xs">{buying.length}</Badge>
            </div>
            <div className="space-y-3">
              {buying.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const activeSessions = filterSessions("active");
  const completedSessions = filterSessions("completed");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isMentor ? "Your Tasks" : "Your Chats"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isMentor 
                  ? "Manage session requests and ongoing mentorship" 
                  : "View and continue your mentorship conversations"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {sessions.filter(s => s.status === "pending").length}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {sessions.filter(s => s.status === "live").length}
                </div>
                <div className="text-xs text-muted-foreground">Live</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {sessions.filter(s => s.status === "completed").length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="gap-2">
              <Play className="h-4 w-4" />
              Active
              {activeSessions.length > 0 && (
                <Badge variant="secondary" className="ml-1">{activeSessions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <InboxIcon className="h-4 w-4" />
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
            {loading ? (
              <LoadingSkeleton />
            ) : activeSessions.length > 0 ? (
              <GroupedSessionList filtered={activeSessions} />
            ) : (
              <EmptyState type="active" />
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            {loading ? (
              <LoadingSkeleton />
            ) : completedSessions.length > 0 ? (
              <GroupedSessionList filtered={completedSessions} />
            ) : (
              <EmptyState type="completed" />
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            {loading ? (
              <LoadingSkeleton />
            ) : sessions.length > 0 ? (
              <GroupedSessionList filtered={sessions} />
            ) : (
              <EmptyState type="" />
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Inbox;
