import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // Get job with capture ID (stored in stripe_payment_intent_id field)
    const { data: job } = await serviceClient
      .from("jobs").select("id, stripe_payment_intent_id, buyer_id, title, accepted_quote_id").eq("id", jobId).single();
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const captureId = job.stripe_payment_intent_id;
    if (!captureId) {
      return new Response(JSON.stringify({ error: "No payment capture found for this order" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get quote price to calculate total refund
    const { data: quote } = await serviceClient
      .from("quotes").select("price").eq("id", job.accepted_quote_id).single();
    const totalRefund = quote ? Number(quote.price) * 1.05 : 0;

    // Check if this was a wallet-only payment (no PayPal capture to refund)
    const isWalletOnly = captureId.startsWith("wallet_only_") || captureId.startsWith("wallet_");

    if (isWalletOnly) {
      // Refund entirely to wallet balance
      await serviceClient.from("transactions").insert({
        user_id: job.buyer_id,
        amount: totalRefund,
        type: "refund",
        status: "completed",
        description: `Refund to store balance for "${job.title}"`,
        stripe_payment_id: `refund_wallet_${jobId}`,
      });

      return new Response(JSON.stringify({
        success: true,
        refundId: `refund_wallet_${jobId}`,
        amount: totalRefund,
        method: "wallet",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PayPal refund for the PayPal-paid portion
    const baseUrl = Deno.env.get("PAYPAL_MODE") === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    const accessToken = await getPayPalAccessToken();

    const refundRes = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // Full refund of the PayPal capture
    });

    if (!refundRes.ok) {
      const errText = await refundRes.text();
      console.error("PayPal refund error:", refundRes.status, errText);
      throw new Error(`PayPal refund failed: ${refundRes.status}`);
    }

    const refundData = await refundRes.json();
    const paypalRefundAmount = Number(refundData.amount?.value || 0);

    // Record PayPal refund transaction
    await serviceClient.from("transactions").insert({
      user_id: job.buyer_id,
      amount: paypalRefundAmount,
      type: "refund",
      status: "completed",
      description: `PayPal refund for "${job.title}"`,
      stripe_payment_id: refundData.id,
    });

    // Also check if there was a wallet deduction for this order and refund that too
    const { data: walletTxns } = await serviceClient
      .from("transactions")
      .select("id, amount")
      .eq("user_id", job.buyer_id)
      .eq("status", "completed")
      .eq("type", "session_payment")
      .eq("stripe_payment_id", `wallet_${jobId}`);

    let walletRefundAmount = 0;
    if (walletTxns && walletTxns.length > 0) {
      walletRefundAmount = walletTxns.reduce((sum, t) => sum + Number(t.amount), 0);
      // Refund the wallet portion back to balance
      await serviceClient.from("transactions").insert({
        user_id: job.buyer_id,
        amount: walletRefundAmount,
        type: "refund",
        status: "completed",
        description: `Wallet credit refund for "${job.title}"`,
        stripe_payment_id: `refund_wallet_${jobId}`,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      refundId: refundData.id,
      amount: paypalRefundAmount + walletRefundAmount,
      paypalRefund: paypalRefundAmount,
      walletRefund: walletRefundAmount,
      method: walletRefundAmount > 0 ? "mixed" : "paypal",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("paypal-refund error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
