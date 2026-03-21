import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    // For webhook, we accept the event directly (no JWT auth)
    // In production, verify webhook signature with STRIPE_WEBHOOK_SECRET
    const body = await req.json();

    // Support both direct calls (from frontend polling) and webhook events
    const { sessionId } = body;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve the Checkout Session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (checkoutSession.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, status: checkoutSession.payment_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const metadata = checkoutSession.metadata || {};
    const jobId = metadata.job_id;
    const quoteId = metadata.quote_id;
    const buyerId = metadata.buyer_id;
    const sellerId = metadata.seller_id;

    if (!jobId || !quoteId || !buyerId || !sellerId) {
      return new Response(JSON.stringify({ error: "Missing metadata" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentIntent = typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id || null;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check if already processed (idempotency)
    const { data: existingJob } = await serviceClient
      .from("jobs")
      .select("status")
      .eq("id", jobId)
      .single();

    if (existingJob?.status === "accepted") {
      return new Response(
        JSON.stringify({ success: true, already_processed: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark job as accepted and paid
    await serviceClient.from("jobs").update({
      status: "accepted",
      accepted_quote_id: quoteId,
      escrow_status: "paid",
      stripe_payment_intent_id: paymentIntent,
    }).eq("id", jobId);

    // Mark quote as accepted
    await serviceClient.from("quotes").update({ status: "accepted" }).eq("id", quoteId);

    // Create session for chat
    const { data: existingSession } = await serviceClient
      .from("sessions")
      .select("id")
      .eq("mentee_id", buyerId)
      .eq("mentor_id", sellerId)
      .maybeSingle();

    if (!existingSession) {
      const capturedAmount = (checkoutSession.amount_total || 0) / 100;
      await serviceClient.from("sessions").insert({
        mentee_id: buyerId,
        mentor_id: sellerId,
        status: "accepted",
        session_type: "chat",
        price: capturedAmount,
        categories: [],
        issue_description: `Job ${jobId}`,
      });
    }

    // Notify seller
    await serviceClient.from("notifications").insert({
      user_id: sellerId,
      type: "order_accepted",
      title: "New order received! 💰",
      message: "A buyer has paid for your service. Start working on the delivery.",
      data: { job_id: jobId, quote_id: quoteId },
    });

    // Notify other sellers who quoted on this job that it's been taken
    const { data: jobData } = await serviceClient.from("jobs").select("title").eq("id", jobId).single();
    const { data: otherQuotes } = await serviceClient.from("quotes").select("expert_id").eq("job_id", jobId).neq("expert_id", sellerId);
    if (otherQuotes?.length) {
      const jobTitle = jobData?.title || "Untitled request";
      await Promise.all(otherQuotes.map((q: any) =>
        serviceClient.from("notifications").insert({
          user_id: q.expert_id,
          type: "offer_taken",
          title: `"${jobTitle}" has been taken`,
          message: "Another expert was selected for this request. Keep quoting to win the next one!",
          data: { job_id: jobId },
        })
      ));
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("stripe-checkout-webhook error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
