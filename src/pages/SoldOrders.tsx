import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package, Clock, CheckCircle2, AlertTriangle, ArrowRight, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SoldOrderData {
  job: any;
  quote: any;
  buyerProfile: any;
  earning: any;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  accepted: { label: "In Progress", variant: "default", icon: Clock },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: AlertTriangle },
  disputed: { label: "Disputed", variant: "destructive", icon: AlertTriangle },
};

const SoldOrders = () => {
  const [orders, setOrders] = useState<SoldOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Get all accepted quotes where I'm the expert
      const { data: quotes } = await supabase
        .from("quotes")
        .select("*")
        .eq("expert_id", user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (!quotes || quotes.length === 0) { setLoading(false); return; }

      const orderPromises = quotes.map(async (quote) => {
        const { data: job } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", quote.job_id)
          .single();

        let buyerProfile = null;
        if (job) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", job.buyer_id)
            .single();
          buyerProfile = profile;
        }

        // Get earnings for this order
        const { data: earnings } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("type", "session_earning")
          .ilike("description", `%${quote.id}%`);

        const earning = earnings?.[0] || null;

        return { job, quote, buyerProfile, earning };
      });

      const results = await Promise.all(orderPromises);
      setOrders(results.filter(o => o.job));
      setLoading(false);
    };
    load();
  }, [navigate]);

  const activeOrders = orders.filter(o => o.job.status === "accepted");
  const completedOrders = orders.filter(o => o.job.status === "completed");
  const disputedOrders = orders.filter(o => o.job.status === "disputed");
  const otherOrders = orders.filter(o => !["accepted", "completed", "disputed"].includes(o.job.status));

  const renderOrder = (order: SoldOrderData) => {
    const config = statusConfig[order.job.status] || statusConfig.accepted;
    const StatusIcon = config.icon;

    return (
      <Card
        key={order.job.id}
        className="cursor-pointer border-border/20 bg-background/40 hover:border-primary/20 hover:bg-primary/[0.03] transition-all duration-300"
        onClick={() => {
          if (order.job.status === "accepted") navigate(`/order/${order.job.id}`);
        }}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-foreground truncate">{order.job.title}</h3>
                <Badge variant={config.variant} className="shrink-0 gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{order.job.description || "No description"}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" />
                  {order.job.category}
                </span>
                <span>{formatDistanceToNow(new Date(order.job.created_at), { addSuffix: true })}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {order.quote.estimated_minutes}min deadline
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <p className="text-lg font-bold text-primary">€{Number(order.quote.price).toFixed(2)}</p>
              {order.earning && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Earned €{Number(order.earning.amount).toFixed(2)}
                </span>
              )}
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 border border-border/30">
                  <AvatarImage src={order.buyerProfile?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {order.buyerProfile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{order.buyerProfile?.display_name || "Buyer"}</span>
              </div>
              {order.job.status === "accepted" && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Sold Orders</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-border/20 bg-background/40">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No sold orders yet</h3>
              <p className="text-sm text-muted-foreground">Accept quotes on open requests to start selling</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="bg-background/60 border border-border/20">
              <TabsTrigger value="active" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> In Progress ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed ({completedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="disputed" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Disputed ({disputedOrders.length})
              </TabsTrigger>
              {otherOrders.length > 0 && (
                <TabsTrigger value="other" className="gap-1.5">
                  Other ({otherOrders.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="active" className="space-y-3">
              {activeOrders.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No active orders</p> : activeOrders.map(renderOrder)}
            </TabsContent>
            <TabsContent value="completed" className="space-y-3">
              {completedOrders.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No completed orders</p> : completedOrders.map(renderOrder)}
            </TabsContent>
            <TabsContent value="disputed" className="space-y-3">
              {disputedOrders.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No disputed orders</p> : disputedOrders.map(renderOrder)}
            </TabsContent>
            {otherOrders.length > 0 && (
              <TabsContent value="other" className="space-y-3">
                {otherOrders.map(renderOrder)}
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SoldOrders;
