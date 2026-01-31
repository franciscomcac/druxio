import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet as WalletIcon,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CreditCard,
  Gift,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

interface TopUpOption {
  amount: number;
  bonus: number;
  popular?: boolean;
}

const topUpOptions: TopUpOption[] = [
  { amount: 5, bonus: 0 },
  { amount: 10, bonus: 0 },
  { amount: 25, bonus: 5 },
  { amount: 50, bonus: 10, popular: true },
  { amount: 100, bonus: 15 },
  { amount: 200, bonus: 25 },
];

const Wallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch user's wallet balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setBalance(profile.wallet_balance || 0);
    }

    // Fetch transactions
    const { data: txns } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (txns) {
      setTransactions(txns);
    }

    setLoading(false);
  };

  const handleTopUp = async (amount: number, bonus: number) => {
    setSelectedAmount(amount);
    setProcessing(true);

    // Simulate payment processing - in real app, integrate with Stripe
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const totalAmount = amount + bonus;

    // Add transaction
    await supabase.from("transactions").insert({
      user_id: session.user.id,
      type: "deposit",
      amount: totalAmount,
      description: `Top-up $${amount}${bonus > 0 ? ` + $${bonus} bonus` : ""}`,
      status: "completed",
    });

    // Update balance
    await supabase
      .from("profiles")
      .update({ wallet_balance: balance + totalAmount })
      .eq("id", session.user.id);

    setBalance((prev) => prev + totalAmount);

    toast({
      title: "Top-up successful!",
      description: `$${totalAmount.toFixed(2)} has been added to your wallet.`,
    });

    setProcessing(false);
    setSelectedAmount(null);

    // Refresh transactions
    checkAuthAndFetch();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "session_payment":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "session_earning":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "refund":
        return <ArrowDownLeft className="h-4 w-4 text-blue-500" />;
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Wallet</h1>
          <p className="text-muted-foreground">
            Manage your balance and view transaction history
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Balance Card */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary-foreground/20 rounded-full">
                  <WalletIcon className="h-6 w-6" />
                </div>
                <span className="text-primary-foreground/80">Available Balance</span>
              </div>
              <div className="text-4xl font-bold mb-6">
                ${balance.toFixed(2)}
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <TrendingUp className="h-4 w-4" />
                <span>Updated just now</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">This Month</p>
                  <p className="text-2xl font-bold text-foreground">$0.00</p>
                  <p className="text-xs text-muted-foreground">spent on sessions</p>
                </div>
                <div className="p-4 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Sessions</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">completed</p>
                </div>
                <div className="p-4 bg-accent/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Saved</p>
                  <p className="text-2xl font-bold text-green-600">$0.00</p>
                  <p className="text-xs text-muted-foreground">from bonuses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Up Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Funds
            </CardTitle>
            <CardDescription>
              Choose an amount to add to your wallet. Get bonus credits on larger top-ups!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topUpOptions.map((option) => (
                <button
                  key={option.amount}
                  onClick={() => handleTopUp(option.amount, option.bonus)}
                  disabled={processing}
                  className={`relative p-6 rounded-xl border-2 transition-all hover:border-primary hover:shadow-md ${
                    selectedAmount === option.amount && processing
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  } ${processing && selectedAmount !== option.amount ? "opacity-50" : ""}`}
                >
                  {option.popular && (
                    <Badge className="absolute -top-2 right-4 bg-green-500 hover:bg-green-500">
                      Most Popular
                    </Badge>
                  )}
                  {option.bonus > 0 && (
                    <div className="absolute -top-2 left-4">
                      <Badge variant="secondary" className="gap-1">
                        <Gift className="h-3 w-3" />
                        +${option.bonus} bonus
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground mb-1">
                      ${option.amount}
                    </p>
                    {option.bonus > 0 && (
                      <p className="text-sm text-green-600">
                        Get ${option.amount + option.bonus} total
                      </p>
                    )}
                  </div>

                  {processing && selectedAmount === option.amount && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Secure payments powered by Stripe</span>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Your recent transactions and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-accent/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-background">
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type === "session_payment" ? "text-red-500" : "text-green-500"
                      }`}>
                        {tx.type === "session_payment" ? "-" : "+"}${tx.amount.toFixed(2)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {tx.status}
                      </Badge>
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
