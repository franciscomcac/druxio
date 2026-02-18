import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Bitcoin, Mail } from "lucide-react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  onSuccess: () => void;
}

const CRYPTO_OPTIONS = [
  { token: "USDT", networks: ["TRC-20", "ERC-20"] },
  { token: "USDC", networks: ["ERC-20", "Solana"] },
  { token: "BTC", networks: ["Bitcoin"] },
  { token: "LTC", networks: ["Litecoin"] },
  { token: "ETH", networks: ["Ethereum"] },
];

const FEE_RATE = 0.05; // 5% withdrawal fee

const WithdrawalDialog = ({ open, onOpenChange, balance, onSuccess }: WithdrawalDialogProps) => {
  const [method, setMethod] = useState<"paypal" | "crypto">("paypal");
  const [amount, setAmount] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [cryptoToken, setCryptoToken] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectedTokenNetworks = CRYPTO_OPTIONS.find(c => c.token === cryptoToken)?.networks || [];

  const numAmount = parseFloat(amount) || 0;
  const feeAmount = numAmount * FEE_RATE;
  const receiveAmount = numAmount - feeAmount;

  const resetForm = () => {
    setAmount("");
    setPaypalEmail("");
    setCryptoToken("");
    setCryptoNetwork("");
    setCryptoAddress("");
  };

  const handleSubmit = async () => {
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Amount must be greater than 0", variant: "destructive" });
      return;
    }
    if (numAmount > balance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    if (method === "paypal" && !paypalEmail) {
      toast({ title: "Enter your PayPal email", variant: "destructive" });
      return;
    }
    if (method === "crypto") {
      if (!cryptoToken || !cryptoNetwork || !cryptoAddress) {
        toast({ title: "Fill in all crypto details", variant: "destructive" });
        return;
      }
      if (cryptoAddress.length < 10) {
        toast({ title: "Enter a valid wallet address", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("withdraw", {
        body: {
          amount: numAmount,
          method,
          paypal_email: method === "paypal" ? paypalEmail : undefined,
          crypto_token: method === "crypto" ? cryptoToken : undefined,
          crypto_network: method === "crypto" ? cryptoNetwork : undefined,
          crypto_address: method === "crypto" ? cryptoAddress : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.status === "completed") {
        toast({ title: "Withdrawal sent! 🎉", description: `€${receiveAmount.toFixed(2)} sent to your PayPal (after 5% fee).` });
      } else {
        toast({ title: "Withdrawal submitted ⏳", description: `€${receiveAmount.toFixed(2)} pending. Processing may take 24-48h.` });
      }
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Withdrawal failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Available balance: <span className="font-semibold text-foreground">€{balance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Method selector */}
          <div className="space-y-2">
            <Label>Withdrawal Method</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={method === "paypal" ? "default" : "outline"}
                className="gap-2"
                onClick={() => { setMethod("paypal"); setCryptoToken(""); setCryptoNetwork(""); setCryptoAddress(""); }}
              >
                <Mail className="h-4 w-4" /> PayPal
              </Button>
              <Button
                type="button"
                variant={method === "crypto" ? "default" : "outline"}
                className="gap-2"
                onClick={() => { setMethod("crypto"); setPaypalEmail(""); }}
              >
                <Bitcoin className="h-4 w-4" /> Crypto
              </Button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (€)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-background/60 border-border"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => setAmount(balance.toFixed(2))}
              >
                Max
              </Button>
            </div>
            {numAmount > 0 && (
              <div className="rounded-lg bg-muted/40 border border-border/40 p-3 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Withdrawal amount</span>
                  <span>€{numAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform fee (5%)</span>
                  <span className="text-destructive">−€{feeAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border/40 pt-1 mt-1">
                  <span>You receive</span>
                  <span className="text-primary">€{receiveAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* PayPal fields */}
          {method === "paypal" && (
            <div className="space-y-2">
              <Label>PayPal Email</Label>
              <Input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-background/60 border-border"
              />
            </div>
          )}

          {/* Crypto fields */}
          {method === "crypto" && (
            <>
              <div className="space-y-2">
                <Label>Token</Label>
                <Select value={cryptoToken} onValueChange={(v) => { setCryptoToken(v); setCryptoNetwork(""); }}>
                  <SelectTrigger className="bg-background/60 border-border">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_OPTIONS.map((c) => (
                      <SelectItem key={c.token} value={c.token}>{c.token}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {cryptoToken && (
                <div className="space-y-2">
                  <Label>Network</Label>
                  <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                    <SelectTrigger className="bg-background/60 border-border">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTokenNetworks.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value)}
                  placeholder="Enter wallet address"
                  className="bg-background/60 border-border font-mono text-sm"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            Withdraw {numAmount > 0 ? `€${numAmount.toFixed(2)}` : "€0.00"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalDialog;
