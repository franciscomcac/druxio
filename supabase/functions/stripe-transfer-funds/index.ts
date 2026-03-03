import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_RATE = 0.05; // 5% seller fee

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing jobId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get job with accepted quote
    const { data: job } = await serviceClient
      .from("jobs")
      .select("id, stripe_payment_intent_id, accepted_quote_id, buyer_id")
      .eq("id", jobId)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the accepted quote for price and seller info
    const { data: quote } = await serviceClient
      .from("quotes")
      .select("price, expert_id")
      .eq("id", job.accepted_quote_id)
      .single();

    if (!quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get seller's Stripe Connect account
    const { data: sellerProfile } = await serviceClient
      .from("profiles")
      .select("stripe_connect_id")
      .eq("id", quote.expert_id)
      .single();

    if (!sellerProfile?.stripe_connect_id) {
      // Fallback: credit seller wallet instead (seller hasn't set up Stripe Connect)
      const servicePrice = Number(quote.price);
      const sellerEarning = Math.round(servicePrice * (1 - PLATFORM_FEE_RATE) * 100) / 100;

      const { data: sp } = await serviceClient
        .from("profiles")
        .select("wallet_balance")
        .eq("id", quote.expert_id)
        .single();

      await serviceClient.from("profiles").update({
        wallet_balance: (Number(sp?.wallet_balance) || 0) + sellerEarning,
      }).eq("id", quote.expert_id);

      // Record earning transaction
      const platformFeeAmount = Math.round(servicePrice * PLATFORM_FEE_RATE * 100) / 100;
      await serviceClient.from("transactions").insert({
        user_id: quote.expert_id,
        amount: sellerEarning,
        type: "session_earning",
        status: "completed",
        description: `Earning for job ${jobId} — €${servicePrice.toFixed(2)} minus 5% fee (€${platformFeeAmount.toFixed(2)})`,
      });

      return new Response(
        JSON.stringify({ success: true, method: "wallet", amount: sellerEarning }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Calculate transfer amount (service price minus 5% seller fee)
    const servicePrice = Number(quote.price);
    const sellerEarning = Math.round(servicePrice * (1 - PLATFORM_FEE_RATE) * 100) / 100;
    const transferAmountCents = Math.round(sellerEarning * 100);

    // Create Stripe Transfer to seller's Connect account
    const transfer = await stripe.transfers.create({
      amount: transferAmountCents,
      currency: "eur",
      destination: sellerProfile.stripe_connect_id,
      transfer_group: `job_${jobId}`,
      metadata: {
        job_id: jobId,
        seller_id: quote.expert_id,
        service_price: servicePrice.toString(),
        platform_fee: (servicePrice - sellerEarning).toString(),
      },
    });

    // Record earning transaction
    await serviceClient.from("transactions").insert({
      user_id: quote.expert_id,
      amount: sellerEarning,
      type: "session_earning",
      status: "completed",
      description: `Earning for job ${jobId} (transferred via Stripe)`,
      stripe_payment_id: transfer.id,
    });

    return new Response(
      JSON.stringify({ success: true, method: "stripe_transfer", transferId: transfer.id, amount: sellerEarning }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("stripe-transfer-funds error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
