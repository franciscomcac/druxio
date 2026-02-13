import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OrderData {
  job: any;
  quote: any;
  sellerProfile: any;
  transaction: any;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  accepted: { label: "Active", variant: "default", icon: Clock },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: AlertTriangle },
  disputed: { label: "Disputed", variant: "destructive", icon: AlertTriangle },
  open: { label: "Open", variant: "outline", icon: Clock },
};

const PurchasedOrders = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Get all jobs where I'm the buyer
      const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (!jobs || jobs.length === 0) { setLoading(false); return; }

      const orderPromises = jobs.map(async (job) => {
        // Get accepted quote for this job
        const { data: quotes } = await supabase
          .from("quotes")
          .select("*")
          .eq("job_id", job.id)
          .eq("status", "accepted");

        const quote = quotes?.[0] || null;

        let sellerProfile = null;
        if (quote) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, rating_avg")
            .eq("id", quote.expert_id)
            .single();
          sellerProfile = profile;
        }

        // Get transaction
        const { data: txns } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("type", "session_payment")
          .order("created_at", { ascending: false });

        const transaction = txns?.find(t => t.description?.includes(job.id)) || txns?.[0] || null;

        return { job, quote, sellerProfile, transaction };
      });

      const results = await Promise.all(orderPromises);
      setOrders(results);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const activeOrders = orders.filter(o => o.job.status === "accepted");
  const completedOrders = orders.filter(o => o.job.status === "completed");
  const disputedOrders = orders.filter(o => o.job.status === "disputed");
  const otherOrders = orders.filter(o => !["accepted", "completed", "disputed"].includes(o.job.status));

  const renderOrder = (order: OrderData) => {
    const config = statusConfig[order.job.status] || statusConfig.open;
    const StatusIcon = config.icon;

    return (
      <Card
        key={order.job.id}
        className="cursor-pointer border-border/20 bg-background/40 hover:border-primary/20 hover:bg-primary/[0.03] transition-all duration-300"
        onClick={() => {
          if (order.job.status === "accepted") navigate(`/order/${order.job.id}`);
          else if (order.job.status === "open") navigate(`/request/${order.job.id}`);
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
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {order.quote && (
                <>
                  <p className="text-lg font-bold text-primary">€{Number(order.quote.price).toFixed(2)}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 border border-border/30">
                      <AvatarImage src={order.sellerProfile?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {order.sellerProfile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{order.sellerProfile?.display_name || "Seller"}</span>
                  </div>
                </>
              )}
              {(order.job.status === "accepted" || order.job.status === "open") && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
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
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Purchased Orders</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-border/20 bg-background/40">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No orders yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Post a request to get started</p>
              <Button onClick={() => navigate("/post-request")}>Post Request</Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="bg-background/60 border border-border/20">
              <TabsTrigger value="active" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Active ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed ({completedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="disputed" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Disputed ({disputedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="other" className="gap-1.5">
                Open & Other ({otherOrders.length})
              </TabsTrigger>
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
            <TabsContent value="other" className="space-y-3">
              {otherOrders.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No other orders</p> : otherOrders.map(renderOrder)}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PurchasedOrders;
