import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShieldCheck, Lock, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PayPalCheckoutButtons from "@/components/payment/PayPalCheckoutButtons";

interface QuoteData {
  id: string;
  price: number;
  estimated_minutes: number;
  message: string | null;
  expert_id: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    rating_avg: number | null;
  };
}

interface JobData {
  id: string;
  title: string;
  category: string;
}

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { format } = useCurrency();

  const jobId = searchParams.get("jobId");
  const quoteId = searchParams.get("quoteId");

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!jobId || !quoteId) {
      navigate("/dashboard");
      return;
    }

    const fetchData = async () => {
      const [quoteRes, jobRes] = await Promise.all([
        supabase
          .from("quotes")
          .select("id, price, estimated_minutes, message, expert_id")
          .eq("id", quoteId)
          .single(),
        supabase
          .from("jobs")
          .select("id, title, category")
          .eq("id", jobId)
          .single(),
      ]);

      if (quoteRes.error || jobRes.error || !quoteRes.data || !jobRes.data) {
        toast({ title: "Error", description: "Could not load checkout details.", variant: "destructive" });
        navigate(-1);
        return;
      }

      // Fetch expert profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, rating_avg")
        .eq("id", quoteRes.data.expert_id)
        .single();

      setQuote({ ...quoteRes.data, profile: profile || undefined });
      setJob(jobRes.data);
      setLoading(false);
    };

    fetchData();
  }, [jobId, quoteId]);

  const handleCreateOrder = async (): Promise<string> => {
    if (!quote || !jobId) throw new Error("Missing data");
    setPaying(true);
    const { data, error } = await supabase.functions.invoke("paypal-create-order", {
      body: { quoteId: quote.id, jobId },
    });
    if (error) { setPaying(false); throw new Error(error.message); }
    if (data?.error) { setPaying(false); throw new Error(data.error); }
    return data.paypalOrderId;
  };

  const handleApprove = async (data: { orderID: string }) => {
    if (!quote || !jobId) return;
    try {
      const { data: captureResult, error } = await supabase.functions.invoke("paypal-capture-order", {
        body: { paypalOrderId: data.orderID, jobId, quoteId: quote.id },
      });
      if (error) throw new Error(error.message);
      if (captureResult?.error) throw new Error(captureResult.error);

      toast({ title: "Payment successful! 🎉", description: `${quote.profile?.display_name || "The expert"} will start working now.` });
      supabase.functions.invoke("send-order-email", { body: { event: "quote_accepted", jobId } }).catch(console.error);
      navigate(`/order/${jobId}`);
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading checkout…</div>
      </div>
    );
  }

  if (!quote || !job) return null;

  const base = quote.price;
  const platformFee = Math.round(base * 0.05 * 100) / 100;
  const total = Math.round((base + platformFee) * 100) / 100;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to request
        </button>

        {/* Main checkout card */}
        <div className="rounded-xl border border-border/60 bg-card p-6 space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4.5 w-4.5 text-primary" />
              Secure Checkout
            </h1>
            <p className="text-sm text-muted-foreground">
              Complete your payment for <span className="text-foreground font-medium">{job.title}</span>
            </p>
          </div>

          {/* Expert info */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/40 p-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              {(quote.profile?.display_name || "E")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {quote.profile?.display_name || "Expert"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{quote.estimated_minutes} min delivery</span>
                {quote.profile?.rating_avg ? (
                  <>
                    <span className="text-border">·</span>
                    <span>⭐ {quote.profile.rating_avg.toFixed(1)}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="rounded-lg border border-border/40 bg-muted/15 p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service price</span>
              <span className="font-medium text-foreground">€{base.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground/60">
              <span>Platform fee (5%)</span>
              <span>€{platformFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-border/40 pt-2.5 flex justify-between">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-lg font-bold text-primary">€{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Trust signals */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Escrow protected</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Buyer protection</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              <span>256-bit SSL</span>
            </div>
          </div>

          {/* PayPal buttons */}
          <div className="pt-1">
            <PayPalCheckoutButtons
              createOrder={handleCreateOrder}
              onApprove={handleApprove}
              onError={() => {
                toast({ title: "Payment error", description: "Something went wrong with PayPal. Please try again.", variant: "destructive" });
                setPaying(false);
              }}
            />
          </div>

          {/* Cancel */}
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground/60 hover:text-foreground"
              onClick={() => navigate(-1)}
              disabled={paying}
            >
              Cancel and go back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
