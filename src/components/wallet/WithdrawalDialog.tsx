import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  onSuccess: () => void;
}

const WithdrawalDialog = ({ open, onOpenChange, balance, onSuccess }: WithdrawalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted?: boolean;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { toast } = useToast();
  const { format } = useCurrency();

  useEffect(() => {
    if (open) checkStripeStatus();
  }, [open]);

  const checkStripeStatus = async () => {
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-account-status");
      if (error) throw error;
      setStripeStatus(data);
    } catch (err) {
      console.error("Failed to check Stripe status:", err);
      setStripeStatus(null);
    }
    setCheckingStatus(false);
  };

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-onboard-seller", {
        body: {
          return_url: window.location.origin + "/wallet",
          refresh_url: window.location.origin + "/wallet",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        toast({ title: "Stripe onboarding opened", description: "Complete the setup in the new tab, then return here." });
      }
    } catch (err: any) {
      toast({ title: "Failed to start onboarding", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const isFullyConnected = stripeStatus?.connected && stripeStatus?.charges_enabled && stripeStatus?.payouts_enabled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Payouts
          </DialogTitle>
          <DialogDescription>
            Wallet balance: <span className="font-semibold text-foreground">{format(balance)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {checkingStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isFullyConnected ? (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-chart-2/30 bg-chart-2/10 p-4">
                <CheckCircle className="h-5 w-5 text-chart-2 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Stripe Connected ✓</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your earnings are transferred directly to your bank account via Stripe. Payouts happen automatically.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 border border-border/40 p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">How payouts work</p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• When a buyer confirms delivery, your earnings (minus 5% fee) are transferred instantly</li>
                  <li>• Stripe sends the money to your bank account on a rolling basis</li>
                  <li>• A €0.25 payout fee applies per withdrawal</li>
                  <li>• You can view payout details in your Stripe dashboard</li>
                </ul>
              </div>

              {balance > 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{format(balance)}</span> in legacy wallet balance from previous orders.
                    This will be transferred in your next completed order.
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={handleConnectStripe}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                Manage Stripe Account
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-chart-4/30 bg-chart-4/10 p-4">
                <AlertCircle className="h-5 w-5 text-chart-4 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {stripeStatus?.connected && !stripeStatus?.details_submitted
                      ? "Complete Stripe Setup"
                      : "Connect Stripe to receive payouts"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stripeStatus?.connected
                      ? "Your Stripe account needs additional details before you can receive payouts."
                      : "Set up your Stripe account to receive direct payouts from completed orders."}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 border border-border/40 p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Benefits</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✓ Direct bank transfers — no manual withdrawals</li>
                  <li>✓ Low payout fees handled by Stripe</li>
                  <li>✓ Automatic payouts on a rolling schedule</li>
                  <li>✓ Secure, powered by Stripe</li>
                </ul>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleConnectStripe}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {stripeStatus?.connected ? "Continue Stripe Setup" : "Connect with Stripe"}
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalDialog;
