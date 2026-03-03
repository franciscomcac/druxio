import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBalance } from "@/hooks/use-balance";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
  Receipt,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PiggyBank,
} from "lucide-react";
import WithdrawalDialog from "@/components/wallet/WithdrawalDialog";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  deposit: "Top Up",
  session_payment: "Payment",
  session_earning: "Earning",
  refund: "Refund",
  withdrawal: "Withdrawal",
};

const Wallet = () => {
  useSEO({ title: "Wallet", noIndex: true });
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { balance, totalEarned, totalSpent, totalRefunded, totalDeposited, loading: balanceLoading, refetch: refetchBalance } = useBalance();

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  const loadTransactions = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: txns } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (txns) setTransactions(txns);
    setTxLoading(false);
  }, [navigate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const loading = txLoading || balanceLoading;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "session_payment": return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case "session_earning": return <ArrowDownLeft className="h-4 w-4 text-chart-2" />;
      case "refund": return <RefreshCw className="h-4 w-4 text-primary" />;
      case "deposit": return <PiggyBank className="h-4 w-4 text-chart-2" />;
      case "withdrawal": return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isIncome = (type: string) => ["session_earning", "refund", "deposit"].includes(type);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const filterByType = (types: string[]) =>
    transactions.filter(t => types.includes(t.type));

  const renderTransaction = (tx: Transaction, index: number) => (
    <div
      key={tx.id}
      className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-accent/60">{getTransactionIcon(tx.type)}</div>
        <div>
          <p className="font-medium text-foreground text-sm">{tx.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/40">{typeLabels[tx.type] || tx.type}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold text-sm ${isIncome(tx.type) ? "text-chart-2" : "text-destructive"}`}>
          {isIncome(tx.type) ? "+" : "−"}{format(tx.amount)}
        </p>
        <Badge variant={tx.status === "completed" ? "secondary" : tx.status === "pending" ? "outline" : "destructive"} className="text-[10px] mt-0.5">
          {tx.status}
        </Badge>
      </div>
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center py-16 text-muted-foreground animate-fade-in">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/40 flex items-center justify-center">
        <WalletIcon className="h-7 w-7 opacity-40" />
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: "Earned", value: totalEarned, icon: TrendingUp, color: "text-chart-2" },
    { label: "Spent", value: totalSpent, icon: TrendingDown, color: "text-destructive" },
    { label: "Refunded", value: totalRefunded, icon: RefreshCw, color: "text-primary" },
    { label: "Deposited", value: totalDeposited, icon: PiggyBank, color: "text-chart-2" },
  ];

  const infoCards = [
    { icon: CreditCard, title: "Pay When You Confirm", desc: "Charged only after accepting a quote." },
    { icon: ShieldCheck, title: "Escrow Protection", desc: "Funds held until delivery is confirmed." },
    { icon: Receipt, title: "Transparent Fees", desc: "Buyers: 5% platform fee + processing. Sellers: 5% on earnings + €0.25 per withdrawal." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 max-w-4xl">

        {/* ── Hero balance section ── */}
        <div className="relative mb-10 animate-fade-in">
          {/* Decorative glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-primary/[0.06] blur-[100px] pointer-events-none" />

          <div className="relative text-center py-10 sm:py-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <WalletIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Your Wallet</span>
            </div>

            <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
            <p className="text-5xl sm:text-6xl font-extrabold text-foreground tracking-tight mb-2">
              {format(balance)}
            </p>
            <p className="text-xs text-muted-foreground mb-6">Earnings + refunds + top-ups − payments − withdrawals</p>

            <Button
              size="lg"
              className="gap-2 px-8 rounded-lg font-bold"
              onClick={() => setWithdrawOpen(true)}
              disabled={balance <= 0}
            >
              <ArrowUpRight className="h-4 w-4" /> Withdraw Funds
            </Button>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-10">
          {statCards.map((stat, i) => (
            <Card
              key={stat.label}
              className="border-border/50 bg-card/60 backdrop-blur-sm animate-fade-in"
              style={{ animationDelay: `${100 + i * 80}ms` }}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-md bg-accent/60">
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{format(stat.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Info cards ── */}
        <div className="grid gap-3 md:grid-cols-3 mb-10">
          {infoCards.map((card, i) => (
            <Card
              key={card.title}
              className="border-border/40 bg-card/40 backdrop-blur-sm animate-fade-in"
              style={{ animationDelay: `${400 + i * 80}ms` }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{card.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Transaction History ── */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm animate-fade-in" style={{ animationDelay: "650ms" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Transaction History</CardTitle>
            <CardDescription>All your financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="bg-accent/40 border border-border/40 flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="all" className="text-xs">All ({transactions.length})</TabsTrigger>
                <TabsTrigger value="earnings" className="text-xs">Earnings ({filterByType(["session_earning"]).length})</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">Payments ({filterByType(["session_payment"]).length})</TabsTrigger>
                <TabsTrigger value="refunds" className="text-xs">Refunds ({filterByType(["refund"]).length})</TabsTrigger>
                <TabsTrigger value="deposits" className="text-xs">Top-ups ({filterByType(["deposit"]).length})</TabsTrigger>
                <TabsTrigger value="withdrawals" className="text-xs">Withdrawals ({filterByType(["withdrawal"]).length})</TabsTrigger>
              </TabsList>

              {["all", "earnings", "payments", "refunds", "deposits", "withdrawals"].map((tab) => {
                const typeMap: Record<string, string[]> = {
                  all: [],
                  earnings: ["session_earning"],
                  payments: ["session_payment"],
                  refunds: ["refund"],
                  deposits: ["deposit"],
                  withdrawals: ["withdrawal"],
                };
                const emptyMap: Record<string, string> = {
                  all: "No transactions yet",
                  earnings: "No earnings yet",
                  payments: "No payments yet",
                  refunds: "No refunds yet",
                  deposits: "No top-ups yet",
                  withdrawals: "No withdrawals yet",
                };
                const items = tab === "all" ? transactions : filterByType(typeMap[tab]);
                return (
                  <TabsContent key={tab} value={tab}>
                    {items.length === 0 ? (
                      renderEmptyState(emptyMap[tab])
                    ) : (
                      <ScrollArea className="h-[400px] pr-3">
                        <div className="space-y-2">
                          {items.map((tx, i) => renderTransaction(tx, i))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        <WithdrawalDialog
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          balance={balance}
          onSuccess={() => { refetchBalance(); loadTransactions(); }}
        />
      </main>
    </div>
  );
};

export default Wallet;
