import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
  Receipt,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

const Wallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: txns } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (txns) {
      setTransactions(txns);
      setTotalSpent(txns.filter(t => t.type === "session_payment").reduce((sum, t) => sum + t.amount, 0));
      setTotalEarned(txns.filter(t => t.type === "session_earning").reduce((sum, t) => sum + t.amount, 0));
    }

    setLoading(false);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "session_payment":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "session_earning":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "refund":
        return <ArrowDownLeft className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payments</h1>
          <p className="text-muted-foreground">
            View your payment history. You pay upfront when you confirm a service with an expert.
          </p>
        </div>

        {/* How it works + Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="border-primary/20 bg-primary/[0.04]">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Pay When You Confirm</p>
                <p className="text-xs text-muted-foreground mt-1">You're only charged after you accept an expert's quote.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/[0.04]">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Secure & Protected</p>
                <p className="text-xs text-muted-foreground mt-1">Payments are held in escrow until the service is delivered.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/[0.04]">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">5% + 5% Fee Split</p>
                <p className="text-xs text-muted-foreground mt-1">Buyers pay 5% on checkout, sellers pay 5% on payout. Fair for everyone.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary cards */}
        <div className="grid gap-6 sm:grid-cols-2 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-foreground">${totalSpent.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">on services purchased</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
              <p className="text-3xl font-bold text-green-500">${totalEarned.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">from services delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent payments and earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm mt-1">When you purchase or deliver a service, it'll show up here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-accent">
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type === "session_payment" ? "text-red-500" : "text-green-500"
                      }`}>
                        {tx.type === "session_payment" ? "-" : "+"}${tx.amount.toFixed(2)}
                      </p>
                      <Badge variant="secondary" className="text-xs">{tx.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Wallet;
