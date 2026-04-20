import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendOrderEmail } from "@/lib/send-email";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, CheckCircle, ArrowUpRight, ShieldCheck, Bitcoin, CreditCard } from "lucide-react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  onSuccess: () => void;
}

const WITHDRAWAL_FEE = 0.25;
const PAYPAL_PAYOUT_RATE = 0.02;
const PAYPAL_PAYOUT_CAP = 1.00;

type WithdrawMethod = "paypal" | "crypto";

const CRYPTO_TOKENS = ["USDT", "USDC", "BTC", "ETH", "SOL", "LTC"];
const CRYPTO_NETWORKS: Record<string, string[]> = {
  USDT: ["TRC-20 (Tron)", "ERC-20 (Ethereum)", "BEP-20 (BSC)", "SOL (Solana)"],
  USDC: ["ERC-20 (Ethereum)", "BEP-20 (BSC)", "SOL (Solana)", "TRC-20 (Tron)"],
  BTC: ["Bitcoin"],
  ETH: ["ERC-20 (Ethereum)"],
  SOL: ["SOL (Solana)"],
  LTC: ["Litecoin"],
};

const WithdrawalDialog = ({ open, onOpenChange, balance, onSuccess }: WithdrawalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WithdrawMethod>("paypal");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [cryptoToken, setCryptoToken] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<{ netAmount: number; destination: string } | null>(null);
  const { toast } = useToast();
  const { format } = useCurrency();

  const numAmount = parseFloat(amount) || 0;
  const paypalFee = method === "paypal" ? Math.min(Math.round(numAmount * PAYPAL_PAYOUT_RATE * 100) / 100, PAYPAL_PAYOUT_CAP) : 0;
  const totalFee = Math.round((WITHDRAWAL_FEE + paypalFee) * 100) / 100;
  const netAmount = Math.round((numAmount - totalFee) * 100) / 100;

  const canSubmitPaypal = numAmount > 0 && numAmount <= balance && netAmount > 0 && paypalEmail.includes("@") && !loading;
  const canSubmitCrypto = numAmount > 0 && numAmount <= balance && netAmount > 0 && cryptoToken && cryptoNetwork && cryptoAddress.length >= 10 && !loading;
  const canSubmit = method === "paypal" ? canSubmitPaypal : canSubmitCrypto;

  const handleWithdraw = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (method === "paypal") {
        const { data, error } = await supabase.functions.invoke("paypal-withdraw", {
          body: { amount: numAmount, paypal_email: paypalEmail },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        setSuccess(true);
        setResult({ netAmount: data.breakdown?.netAmount || netAmount, destination: paypalEmail });
      } else {
        // Crypto: create a pending withdrawal for admin to process
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error: insertErr } = await supabase.from("withdrawals").insert({
          user_id: user.id,
          amount: numAmount,
          method: "crypto",
          crypto_token: cryptoToken,
          crypto_network: cryptoNetwork,
          crypto_address: cryptoAddress,
          status: "pending",
        });
        if (insertErr) throw new Error(insertErr.message);

        // Deduct from wallet via a withdrawal transaction
        const { error: txErr } = await supabase.from("transactions").insert({
          user_id: user.id,
          amount: numAmount,
          type: "withdrawal",
          status: "completed",
          description: `Crypto withdrawal (${cryptoToken} on ${cryptoNetwork})`,
        });
        if (txErr) throw new Error(txErr.message);

        setSuccess(true);
        setResult({ netAmount, destination: `${cryptoToken} wallet` });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && method === "paypal") {
        sendOrderEmail("withdrawal_submitted", {
          userId: user.id,
          amount: numAmount,
          netAmount,
          paypalEmail,
        });
      }

      onSuccess();
    } catch (err: any) {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleClose = () => {
    setAmount("");
    setPaypalEmail("");
    setCryptoToken("");
    setCryptoNetwork("");
    setCryptoAddress("");
    setMethod("paypal");
    setSuccess(false);
    setResult(null);
    onOpenChange(false);
  };

  const availableNetworks = cryptoToken ? CRYPTO_NETWORKS[cryptoToken] || [] : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card/95 backdrop-blur-md border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Available balance: <span className="font-semibold text-foreground">{format(balance)}</span>
          </DialogDescription>
        </DialogHeader>

        {success && result ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-chart-2/10">
                <CheckCircle className="h-10 w-10 text-chart-2" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {method === "crypto" ? "Withdrawal submitted! 📝" : "Withdrawal sent! 🎉"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {method === "crypto"
                    ? <>€{netAmount.toFixed(2)} withdrawal to your <span className="font-medium text-foreground">{result.destination}</span> is pending admin review</>
                    : <>€{result.netAmount.toFixed(2)} has been sent to <span className="font-medium text-foreground">{result.destination}</span></>
                  }
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/40 p-3">
              <p className="text-xs text-muted-foreground text-center">
                {method === "crypto"
                  ? "Your crypto withdrawal will be processed manually by our team. You'll be notified once complete."
                  : "PayPal payouts are typically instant. Check your PayPal account for the funds."
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Method selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setMethod("paypal"); setCryptoToken(""); setCryptoNetwork(""); setCryptoAddress(""); }}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                  method === "paypal"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/40 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <CreditCard className="h-4 w-4" /> PayPal
              </button>
              <button
                type="button"
                onClick={() => { setMethod("crypto"); setPaypalEmail(""); }}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
                  method === "crypto"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/40 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Bitcoin className="h-4 w-4" /> Crypto
              </button>
            </div>

            {method === "paypal" ? (
              <div className="space-y-2">
                <Label htmlFor="paypal-email" className="text-sm font-medium">PayPal Email</Label>
                <Input
                  id="paypal-email"
                  type="email"
                  placeholder="your@email.com"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Token</Label>
                  <Select value={cryptoToken} onValueChange={(v) => { setCryptoToken(v); setCryptoNetwork(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select token" /></SelectTrigger>
                    <SelectContent>
                      {CRYPTO_TOKENS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Network / Chain</Label>
                  <Select value={cryptoNetwork} onValueChange={setCryptoNetwork} disabled={!cryptoToken}>
                    <SelectTrigger><SelectValue placeholder={cryptoToken ? "Select network" : "Select token first"} /></SelectTrigger>
                    <SelectContent>
                      {availableNetworks.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Wallet Address</Label>
                  <Input
                    placeholder="Enter your wallet address"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    disabled={loading}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">Amount (€)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                min="1"
                max={balance}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => setAmount(balance.toFixed(2))}
                disabled={loading}
              >
                Withdraw all ({format(balance)})
              </Button>
            </div>

            {numAmount > 0 && (
              <div className="rounded-lg border border-border bg-background/40 p-4 space-y-2 animate-fade-in">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Withdrawal amount</span>
                  <span className="font-medium text-foreground">€{numAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs opacity-60">
                  <span className="text-muted-foreground">Flat fee</span>
                  <span className="text-muted-foreground">−€{WITHDRAWAL_FEE.toFixed(2)}</span>
                </div>
                {method === "paypal" && (
                  <div className="flex justify-between text-xs opacity-60">
                    <span className="text-muted-foreground">PayPal fee (2%, max €1)</span>
                    <span className="text-muted-foreground">−€{paypalFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="font-semibold text-foreground">You receive</span>
                  <span className={`font-bold ${netAmount > 0 ? "text-chart-2" : "text-destructive"}`}>
                    €{Math.max(0, netAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              {method === "paypal"
                ? "Funds are sent instantly to your PayPal account."
                : "Crypto withdrawals are processed manually by our team, usually within 24h."
              }
            </div>
          </div>
        )}

        <DialogFooter>
          {success ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button onClick={handleWithdraw} disabled={!canSubmit} className="gap-2">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                ) : method === "paypal" ? (
                  <><ArrowUpRight className="h-4 w-4" /> Withdraw via PayPal</>
                ) : (
                  <><Bitcoin className="h-4 w-4" /> Submit Crypto Withdrawal</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalDialog;
