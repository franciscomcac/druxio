import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_RATE = 0.05; // 5% seller fee

const stripWrappingQuotes = (v: string) => v.replace(/^['"]+|['"]+$/g, "");

type PayPalMode = "live" | "sandbox";

function resolveMode(): { mode: PayPalMode; baseUrl: string } {
  const raw = Deno.env.get("PAYPAL_MODE");
  const mode: PayPalMode = raw?.trim().toLowerCase() === "live" ? "live" : "sandbox";
  const baseUrl = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  return { mode, baseUrl };
}

async function fetchToken(baseUrl: string, clientId: string, secret: string): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return (await res.json()).access_token;
}

async function getPayPalAuth(): Promise<{ accessToken: string; baseUrl: string }> {
  const clientId = stripWrappingQuotes(Deno.env.get("PAYPAL_CLIENT_ID")?.trim() || "");
  const secret = stripWrappingQuotes(Deno.env.get("PAYPAL_SECRET")?.trim() || "");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const { mode, baseUrl } = resolveMode();
  try {
    const accessToken = await fetchToken(baseUrl, clientId, secret);
    return { accessToken, baseUrl };
  } catch {
    // Fallback: try opposite mode
    const fallbackUrl = mode === "live" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    const accessToken = await fetchToken(fallbackUrl, clientId, secret);
    console.warn(`PAYPAL_MODE='${mode}' failed auth; falling back to ${mode === "live" ? "sandbox" : "live"}`);
    return { accessToken, baseUrl: fallbackUrl };
  }
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

    // Get job with accepted quote
    const { data: job } = await serviceClient
      .from("jobs").select("id, accepted_quote_id, buyer_id, title").eq("id", jobId).single();
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      const { accessToken, baseUrl } = await getPayPalAuth();

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
        // Fallback: credit wallet
        const currentBalance = Number(sellerProfile?.wallet_balance || 0);
        await serviceClient.from("profiles").update({
          wallet_balance: currentBalance + sellerEarning,
        }).eq("id", quote.expert_id);

        await serviceClient.from("transactions").insert({
          user_id: quote.expert_id,
          amount: sellerEarning,
          type: "session_earning",
          status: "completed",
          description: `Earning for "${job.title}" — €${servicePrice.toFixed(2)} minus 5% fee (€${platformFeeAmount.toFixed(2)}). PayPal payout failed, credited to wallet.`,
        });

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
        stripe_payment_id: payoutData.batch_header?.payout_batch_id || batchId,
      });

      return new Response(JSON.stringify({
        success: true,
        method: "paypal_payout",
        amount: sellerEarning,
        payoutBatchId: payoutData.batch_header?.payout_batch_id,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      // No PayPal email — credit wallet
      const currentBalance = Number(sellerProfile?.wallet_balance || 0);
      await serviceClient.from("profiles").update({
        wallet_balance: currentBalance + sellerEarning,
      }).eq("id", quote.expert_id);

      await serviceClient.from("transactions").insert({
        user_id: quote.expert_id,
        amount: sellerEarning,
        type: "session_earning",
        status: "completed",
        description: `Earning for "${job.title}" — €${servicePrice.toFixed(2)} minus 5% fee (€${platformFeeAmount.toFixed(2)}). No PayPal linked, credited to wallet.`,
      });

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
