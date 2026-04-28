import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_RATE = 0.05; // 5% seller fee

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const baseUrl = Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function creditSellerWallet(
  serviceClient: ReturnType<typeof createClient>,
  sellerId: string,
  sellerProfile: any,
  sellerEarning: number,
  servicePrice: number,
  platformFeeAmount: number,
  jobTitle: string,
  jobId: string,
  reason: string,
) {
  const existing = await serviceClient
    .from("transactions")
    .select("id")
    .eq("user_id", sellerId)
    .eq("type", "session_earning")
    .eq("stripe_payment_id", `release_${jobId}`)
    .maybeSingle();

  if (existing.data) return;

  const currentBalance = Number(sellerProfile?.wallet_balance || 0);
  await serviceClient.from("profiles").update({
    wallet_balance: currentBalance + sellerEarning,
  }).eq("id", sellerId);

  await serviceClient.from("transactions").insert({
    user_id: sellerId,
    amount: sellerEarning,
    type: "session_earning",
    status: "completed",
    description: `Earning for "${jobTitle}" — €${servicePrice.toFixed(2)} minus 5% fee (€${platformFeeAmount.toFixed(2)}). ${reason}`,
    stripe_payment_id: `release_${jobId}`,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing jobId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get job with accepted quote
    const { data: job } = await serviceClient
      .from("jobs").select("id, accepted_quote_id, buyer_id, title, status, escrow_status").eq("id", jobId).single();
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.buyer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the buyer can release this payment" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status === "completed" || job.escrow_status === "completed") {
      return new Response(JSON.stringify({ success: true, method: "already_completed", amount: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.escrow_status !== "delivered") {
      return new Response(JSON.stringify({ error: "Order must be delivered before payment can be released" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the accepted quote
    const { data: quote } = await serviceClient
      .from("quotes").select("price, expert_id").eq("id", job.accepted_quote_id).single();
    if (!quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get seller's profile for PayPal email
    const { data: sellerProfile } = await serviceClient
      .from("profiles").select("display_name, wallet_balance").eq("id", quote.expert_id).single();

    // Check if seller has a PayPal email on file (from their latest withdrawal or settings)
    // For now, we look for their latest withdrawal with paypal_email
    const { data: latestWithdrawal } = await serviceClient
      .from("withdrawals").select("paypal_email")
      .eq("user_id", quote.expert_id).eq("method", "paypal")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const sellerPaypalEmail = latestWithdrawal?.paypal_email;

    const servicePrice = Number(quote.price);
    const sellerEarning = Math.round(servicePrice * (1 - PLATFORM_FEE_RATE) * 100) / 100;
    const platformFeeAmount = Math.round(servicePrice * PLATFORM_FEE_RATE * 100) / 100;

    if (sellerPaypalEmail) {
      // Send instant PayPal payout
      const baseUrl = Deno.env.get("PAYPAL_MODE") === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

      let accessToken: string;
      try {
        accessToken = await getPayPalAccessToken();
      } catch (paypalAuthError) {
        console.error("PayPal auth failed; crediting wallet instead:", paypalAuthError);
        await creditSellerWallet(serviceClient, quote.expert_id, sellerProfile, sellerEarning, servicePrice, platformFeeAmount, job.title, jobId, "PayPal payout unavailable, credited to wallet.");
        return new Response(JSON.stringify({
          success: true, method: "wallet_fallback", amount: sellerEarning,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const batchId = `druxio_${jobId}_${Date.now()}`;
      const payoutRes = await fetch(`${baseUrl}/v1/payments/payouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender_batch_header: {
            sender_batch_id: batchId,
            email_subject: "You have a payment from Druxio!",
            email_message: `Payment of €${sellerEarning.toFixed(2)} for completing "${job.title}".`,
          },
          items: [{
            recipient_type: "EMAIL",
            amount: { value: sellerEarning.toFixed(2), currency: "EUR" },
            receiver: sellerPaypalEmail,
            note: `Earning for order: ${job.title} (5% fee deducted)`,
            sender_item_id: `job_${jobId}`,
          }],
        }),
      });

      if (!payoutRes.ok) {
        const errText = await payoutRes.text();
        console.error("PayPal payout error:", payoutRes.status, errText);
        await creditSellerWallet(serviceClient, quote.expert_id, sellerProfile, sellerEarning, servicePrice, platformFeeAmount, job.title, jobId, "PayPal payout failed, credited to wallet.");

        return new Response(JSON.stringify({
          success: true, method: "wallet_fallback", amount: sellerEarning,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payoutData = await payoutRes.json();

      // Record earning transaction
      await serviceClient.from("transactions").insert({
        user_id: quote.expert_id,
        amount: sellerEarning,
        type: "session_earning",
        status: "completed",
        description: `Earning for "${job.title}" — €${servicePrice.toFixed(2)} minus 5% fee (€${platformFeeAmount.toFixed(2)}). Sent to PayPal (${sellerPaypalEmail}).`,
        stripe_payment_id: `release_${jobId}`,
      });

      return new Response(JSON.stringify({
        success: true,
        method: "paypal_payout",
        amount: sellerEarning,
        payoutBatchId: payoutData.batch_header?.payout_batch_id,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      // No PayPal email — credit wallet
      await creditSellerWallet(serviceClient, quote.expert_id, sellerProfile, sellerEarning, servicePrice, platformFeeAmount, job.title, jobId, "No PayPal linked, credited to wallet.");

      return new Response(JSON.stringify({
        success: true, method: "wallet", amount: sellerEarning,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("paypal-payout error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
