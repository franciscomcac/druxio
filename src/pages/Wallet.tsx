import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBalance } from "@/hooks/use-balance";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DollarSign,
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

  const renderTransaction = (tx: Transaction) => (
    <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-full bg-accent">{getTransactionIcon(tx.type)}</div>
        <div>
          <p className="font-medium text-foreground text-sm">{tx.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{typeLabels[tx.type] || tx.type}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isIncome(tx.type) ? "text-chart-2" : "text-destructive"}`}>
          {isIncome(tx.type) ? "+" : "-"}{format(tx.amount)}
        </p>
        <Badge variant={tx.status === "completed" ? "secondary" : tx.status === "pending" ? "outline" : "destructive"} className="text-[10px]">
          {tx.status}
        </Badge>
      </div>
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center py-12 text-muted-foreground">
      <WalletIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
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

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        {/* Balance Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" /> Balance
          </h1>
          <p className="text-muted-foreground text-sm">All your earnings, payments, and refunds in one place.</p>
        </div>

        {/* Main Balance Card */}
        <Card className="border-primary/30 bg-primary/[0.04] mb-6">
          <CardContent className="p-6 sm:p-8 text-center">
            <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
            <p className="text-4xl sm:text-5xl font-bold text-foreground">{format(balance)}</p>
            <p className="text-xs text-muted-foreground mt-2">All earnings, refunds & top-ups minus payments</p>
            <Button className="mt-4 gap-2 w-full sm:w-auto" onClick={() => setWithdrawOpen(true)} disabled={balance <= 0}>
              <ArrowUpRight className="h-4 w-4" /> Withdraw
            </Button>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-chart-2" />
                <p className="text-xs text-muted-foreground">Earned</p>
              </div>
              <p className="text-xl font-bold text-foreground">{format(totalEarned)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <p className="text-xs text-muted-foreground">Spent</p>
              </div>
              <p className="text-xl font-bold text-foreground">{format(totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Refunded</p>
              </div>
              <p className="text-xl font-bold text-foreground">{format(totalRefunded)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <PiggyBank className="h-4 w-4 text-chart-2" />
                <p className="text-xs text-muted-foreground">Deposited</p>
              </div>
              <p className="text-xl font-bold text-foreground">{format(totalDeposited)}</p>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm">Pay When You Confirm</p>
                <p className="text-xs text-muted-foreground mt-0.5">Charged only after accepting a quote.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm">Escrow Protection</p>
                <p className="text-xs text-muted-foreground mt-0.5">Funds held until delivery is confirmed.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <Receipt className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-sm">Transparent Fees</p>
                <p className="text-xs text-muted-foreground mt-0.5">Buyers: 5% platform + PayPal processing. Sellers: 5% payout fee. PayPal withdrawal: +2% (max €1).</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All your financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="bg-background/60 border border-border flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="all" className="text-xs">All ({transactions.length})</TabsTrigger>
                <TabsTrigger value="earnings" className="text-xs">Earnings ({filterByType(["session_earning"]).length})</TabsTrigger>
                <TabsTrigger value="payments" className="text-xs">Payments ({filterByType(["session_payment"]).length})</TabsTrigger>
                <TabsTrigger value="refunds" className="text-xs">Refunds ({filterByType(["refund"]).length})</TabsTrigger>
                <TabsTrigger value="deposits" className="text-xs">Top-ups ({filterByType(["deposit"]).length})</TabsTrigger>
                <TabsTrigger value="withdrawals" className="text-xs">Withdrawals ({filterByType(["withdrawal"]).length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {transactions.length === 0 ? renderEmptyState("No transactions yet") : transactions.map(renderTransaction)}
              </TabsContent>
              <TabsContent value="earnings" className="space-y-3">
                {filterByType(["session_earning"]).length === 0 ? renderEmptyState("No earnings yet") : filterByType(["session_earning"]).map(renderTransaction)}
              </TabsContent>
              <TabsContent value="payments" className="space-y-3">
                {filterByType(["session_payment"]).length === 0 ? renderEmptyState("No payments yet") : filterByType(["session_payment"]).map(renderTransaction)}
              </TabsContent>
              <TabsContent value="refunds" className="space-y-3">
                {filterByType(["refund"]).length === 0 ? renderEmptyState("No refunds yet") : filterByType(["refund"]).map(renderTransaction)}
              </TabsContent>
              <TabsContent value="deposits" className="space-y-3">
                {filterByType(["deposit"]).length === 0 ? renderEmptyState("No top-ups yet") : filterByType(["deposit"]).map(renderTransaction)}
              </TabsContent>
              <TabsContent value="withdrawals" className="space-y-3">
                {filterByType(["withdrawal"]).length === 0 ? renderEmptyState("No withdrawals yet") : filterByType(["withdrawal"]).map(renderTransaction)}
              </TabsContent>
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
