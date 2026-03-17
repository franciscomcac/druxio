import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_RATE = 0.05;

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: eligibleJobs, error } = await supabase
      .from("jobs")
      .select("id, buyer_id, title, accepted_quote_id, stripe_payment_intent_id")
      .eq("escrow_status", "delivered")
      .eq("status", "in_progress")
      .lt("delivered_at", THREE_DAYS_AGO);

    if (error) throw error;
    if (!eligibleJobs || eligibleJobs.length === 0) {
      return new Response(JSON.stringify({ released: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let released = 0;

    for (const job of eligibleJobs) {
      try {
        const { data: quote } = await supabase
          .from("quotes").select("*").eq("job_id", job.id).eq("status", "accepted").maybeSingle();
        if (!quote) continue;

        const servicePrice = Number(quote.price);
        const sellerEarning = Math.round(servicePrice * (1 - PLATFORM_FEE_RATE) * 100) / 100;
        const platformFeeAmt = Math.round(servicePrice * PLATFORM_FEE_RATE * 100) / 100;

        // Try PayPal payout to seller
        const { data: sellerProfile } = await supabase
          .from("profiles").select("wallet_balance, display_name").eq("id", quote.expert_id).single();

        const { data: latestWithdrawal } = await supabase
          .from("withdrawals").select("paypal_email")
          .eq("user_id", quote.expert_id).eq("method", "paypal")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();

        const sellerPaypalEmail = latestWithdrawal?.paypal_email;
        let payoutMethod = "wallet";

        if (sellerPaypalEmail) {
          try {
            const baseUrl = Deno.env.get("PAYPAL_MODE") === "live"
              ? "https://api-m.paypal.com"
              : "https://api-m.sandbox.paypal.com";
            const accessToken = await getPayPalAccessToken();
            const batchId = `druxio_auto_${job.id}_${Date.now()}`;

            const payoutRes = await fetch(`${baseUrl}/v1/payments/payouts`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sender_batch_header: {
                  sender_batch_id: batchId,
                  email_subject: "Payment auto-released from Druxio!",
                  email_message: `€${sellerEarning.toFixed(2)} for completing "${job.title}".`,
                },
                items: [{
                  recipient_type: "EMAIL",
                  amount: { value: sellerEarning.toFixed(2), currency: "EUR" },
                  receiver: sellerPaypalEmail,
                  note: `Auto-released earning for: ${job.title}`,
                  sender_item_id: `auto_${job.id}`,
                }],
              }),
            });

            if (payoutRes.ok) {
              const payoutData = await payoutRes.json();
              payoutMethod = "paypal_payout";

              await supabase.from("transactions").insert({
                user_id: quote.expert_id,
                amount: sellerEarning,
                type: "session_earning",
                status: "completed",
                description: `Auto-released: "${job.title}" — €${servicePrice.toFixed(2)} minus 5% fee (€${platformFeeAmt.toFixed(2)}). Sent to PayPal.`,
                stripe_payment_id: payoutData.batch_header?.payout_batch_id || batchId,
              });
            } else {
              // Fallback to wallet
              console.error("PayPal auto-payout failed, falling back to wallet");
            }
          } catch (paypalErr) {
            console.error("PayPal auto-payout error:", paypalErr);
          }
        }

        if (payoutMethod === "wallet") {
          const currentBalance = Number(sellerProfile?.wallet_balance || 0);
          await supabase.from("profiles").update({
            wallet_balance: currentBalance + sellerEarning,
          }).eq("id", quote.expert_id);

          await supabase.from("transactions").insert({
            user_id: quote.expert_id,
            amount: sellerEarning,
            type: "session_earning",
            status: "completed",
            description: `Auto-released: "${job.title}" — €${servicePrice.toFixed(2)} minus 5% fee (€${platformFeeAmt.toFixed(2)}). Credited to wallet.`,
          });
        }

        // Mark job completed
        await supabase.from("jobs").update({ status: "completed", escrow_status: "completed" }).eq("id", job.id);

        // Mark session completed + auto-review
        const { data: session } = await supabase
          .from("sessions").select("id")
          .eq("mentee_id", job.buyer_id).eq("mentor_id", quote.expert_id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();

        if (session) {
          await supabase.from("sessions").update({ status: "completed" }).eq("id", session.id);
          const { data: existingReview } = await supabase
            .from("reviews").select("id").eq("session_id", session.id).eq("reviewer_id", job.buyer_id).maybeSingle();
          if (!existingReview) {
            await supabase.from("reviews").insert({
              session_id: session.id, reviewer_id: job.buyer_id, reviewee_id: quote.expert_id,
              rating: 5, comment: "Order auto-completed — buyer did not dispute within 3 days.",
            });
          }
        }

        // Notifications
        await supabase.from("notifications").insert({
          user_id: quote.expert_id, type: "order_completed",
          title: "Payment auto-released! 💰",
          message: `Your order "${job.title}" was auto-completed. €${sellerEarning.toFixed(2)} transferred.`,
          data: { job_id: job.id },
        });
        await supabase.from("notifications").insert({
          user_id: job.buyer_id, type: "order_completed",
          title: "Order auto-completed",
          message: `Your order "${job.title}" was automatically completed and payment released.`,
          data: { job_id: job.id },
        });

        released++;
      } catch (jobErr) {
        console.error(`Failed to auto-release job ${job.id}:`, jobErr);
      }
    }

    return new Response(JSON.stringify({ released }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auto-release-funds error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
