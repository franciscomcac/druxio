import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShieldCheck, Lock, Clock, CheckCircle2, CreditCard, Star, Zap } from "lucide-react";
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
    total_sessions: number | null;
  };
}

interface JobData {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
}

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

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
          .select("id, title, category, subcategory")
          .eq("id", jobId)
          .single(),
      ]);

      if (quoteRes.error || jobRes.error || !quoteRes.data || !jobRes.data) {
        toast({ title: "Error", description: "Could not load checkout details.", variant: "destructive" });
        navigate(-1);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, rating_avg, total_sessions")
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
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Preparing checkout…</p>
        </div>
      </div>
    );
  }

  if (!quote || !job) return null;

  const base = quote.price;
  const platformFee = Math.round(base * 0.05 * 100) / 100;
  const total = Math.round((base + platformFee) * 100) / 100;
  const subcategoryLabel = job.subcategory
    ? job.subcategory.split(":").pop()?.trim() || job.subcategory
    : job.category;

  return (
    <div className="min-h-[80vh] py-8 px-4 md:px-8">
      {/* Top bar */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
          <Lock className="h-3 w-3" />
          Secure checkout
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — Order summary (3 cols) */}
        <div className="lg:col-span-3 space-y-5">
          {/* Order header */}
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <h1 className="text-lg font-semibold text-foreground mb-1">Order Summary</h1>
            <p className="text-sm text-muted-foreground mb-5">Review your order before payment</p>

            {/* Task info */}
            <div className="rounded-lg bg-muted/20 border border-border/30 p-4 mb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-1">{job.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                      {subcategoryLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground">€{base.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Expert card */}
            <div className="rounded-lg border border-border/30 p-4">
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Service Provider</p>
              <div className="flex items-center gap-3">
                {quote.profile?.avatar_url ? (
                  <img
                    src={quote.profile.avatar_url}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-border/30"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm ring-2 ring-border/30">
                    {(quote.profile?.display_name || "E")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {quote.profile?.display_name || "Expert"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {quote.profile?.rating_avg ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {quote.profile.rating_avg.toFixed(1)}
                      </span>
                    ) : null}
                    {quote.profile?.total_sessions ? (
                      <span>{quote.profile.total_sessions} orders</span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {quote.estimated_minutes} min delivery
                    </span>
                  </div>
                </div>
              </div>
              {quote.message && (
                <p className="mt-3 text-xs text-muted-foreground/80 bg-muted/15 rounded-md p-2.5 border border-border/20">
                  "{quote.message}"
                </p>
              )}
            </div>
          </div>

          {/* Escrow info */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-0.5">Escrow Protection</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your payment is held securely in escrow. Funds are only released to the seller after you confirm the delivery meets your requirements.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Payment (2 cols) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border/50 bg-card p-6 lg:sticky lg:top-24 space-y-5">
            <h2 className="text-base font-semibold text-foreground">Payment</h2>

            {/* Price breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service price</span>
                <span className="text-foreground">€{base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee (5%)</span>
                <span className="text-foreground">€{platformFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-border/40 pt-3 flex justify-between items-baseline">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">€{total.toFixed(2)}</span>
              </div>
            </div>

            {/* PayPal buttons */}
            <div className="pt-2">
              <PayPalCheckoutButtons
                createOrder={handleCreateOrder}
                onApprove={handleApprove}
                onError={() => {
                  toast({ title: "Payment error", description: "Something went wrong with PayPal. Please try again.", variant: "destructive" });
                  setPaying(false);
                }}
              />
            </div>

            {/* Trust signals */}
            <div className="border-t border-border/30 pt-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>256-bit SSL encrypted payment</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Funds held in escrow until delivery</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>PayPal Buyer Protection included</span>
              </div>
            </div>

            {/* Cancel */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground/50 hover:text-foreground"
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
