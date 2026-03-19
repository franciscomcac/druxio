import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendOrderEmail } from "@/lib/send-email";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, CheckCircle, ArrowUpRight, ShieldCheck } from "lucide-react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  onSuccess: () => void;
}

const WITHDRAWAL_FEE = 0.25;
const PAYPAL_PAYOUT_RATE = 0.02;
const PAYPAL_PAYOUT_CAP = 1.00;

const WithdrawalDialog = ({ open, onOpenChange, balance, onSuccess }: WithdrawalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<{ netAmount: number; paypalEmail: string } | null>(null);
  const { toast } = useToast();
  const { format } = useCurrency();

  const numAmount = parseFloat(amount) || 0;
  const paypalFee = Math.min(Math.round(numAmount * PAYPAL_PAYOUT_RATE * 100) / 100, PAYPAL_PAYOUT_CAP);
  const totalFee = Math.round((WITHDRAWAL_FEE + paypalFee) * 100) / 100;
  const netAmount = Math.round((numAmount - totalFee) * 100) / 100;

  const canSubmit = numAmount > 0 && numAmount <= balance && netAmount > 0 && paypalEmail.includes("@") && !loading;

  const handleWithdraw = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-withdraw", {
        body: { amount: numAmount, paypal_email: paypalEmail },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      setResult({ netAmount: data.breakdown?.netAmount || netAmount, paypalEmail });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleClose = () => {
    setAmount("");
    setPaypalEmail("");
    setSuccess(false);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border sm:max-w-md">
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
                <p className="text-lg font-bold text-foreground">Withdrawal sent! 🎉</p>
                <p className="text-sm text-muted-foreground mt-1">
                  €{result.netAmount.toFixed(2)} has been sent to <span className="font-medium text-foreground">{result.paypalEmail}</span>
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border/40 p-3">
              <p className="text-xs text-muted-foreground text-center">
                PayPal payouts are typically instant. Check your PayPal account for the funds.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
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
                  <span className="text-muted-foreground">Platform fee</span>
                  <span className="text-muted-foreground">−€{WITHDRAWAL_FEE.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs opacity-60">
                  <span className="text-muted-foreground">PayPal fee (2%, max €1)</span>
                  <span className="text-muted-foreground">−€{paypalFee.toFixed(2)}</span>
                </div>
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
              Funds are sent instantly to your PayPal account. No waiting!
            </div>

            {/* PayPal trust signal */}
            <div className="flex items-center justify-center gap-2 opacity-50">
              <svg viewBox="0 0 100 26" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                <text x="50" y="18" textAnchor="middle" fill="#003087" fontSize="16" fontWeight="700" fontFamily="Arial,sans-serif">PayPal</text>
              </svg>
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
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><ArrowUpRight className="h-4 w-4" /> Withdraw via PayPal</>}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalDialog;
