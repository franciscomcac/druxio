import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_RATE = 0.05; // 5% buyer fee

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { quoteId, jobId } = await req.json();
    if (!quoteId || !jobId) {
      return new Response(JSON.stringify({ error: "Missing quoteId or jobId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the job belongs to this buyer
    const { data: job } = await supabase
      .from("jobs")
      .select("id, buyer_id, status, title")
      .eq("id", jobId)
      .single();

    if (!job || job.buyer_id !== userId) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quote
    const { data: quote } = await supabase
      .from("quotes")
      .select("price, expert_id")
      .eq("id", quoteId)
      .single();

    if (!quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basePrice = Number(quote.price);
    const platformFee = Math.round(basePrice * PLATFORM_RATE * 100) / 100;
    const total = Math.round((basePrice + platformFee) * 100) / 100;
    const totalCents = Math.round(total * 100);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: job.title || "Service Payment",
              description: `Service: €${basePrice.toFixed(2)} + Platform fee: €${platformFee.toFixed(2)}`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_group: `job_${jobId}`,
        metadata: {
          job_id: jobId,
          quote_id: quoteId,
          buyer_id: userId,
          seller_id: quote.expert_id,
          base_price: basePrice.toString(),
          platform_fee: platformFee.toString(),
        },
      },
      metadata: {
        job_id: jobId,
        quote_id: quoteId,
        buyer_id: userId,
        seller_id: quote.expert_id,
      },
      success_url: `https://druxio.lovable.app/order/${jobId}?payment=success`,
      cancel_url: `https://druxio.lovable.app/request/${jobId}?payment=cancelled`,
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        breakdown: { basePrice, platformFee, total },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("stripe-create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
