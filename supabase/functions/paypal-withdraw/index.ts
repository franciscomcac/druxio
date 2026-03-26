import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WITHDRAWAL_FEE = 0.25; // €0.25 flat fee
const PAYPAL_PAYOUT_RATE = 0.02;
const PAYPAL_PAYOUT_CAP = 1.00;

type PayPalMode = "live" | "sandbox";

async function getPayPalAuth(): Promise<{ accessToken: string; baseUrl: string; mode: PayPalMode }> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const configuredMode = (Deno.env.get("PAYPAL_MODE") || "sandbox").trim().toLowerCase();
  const preferredMode: PayPalMode = configuredMode === "live" ? "live" : "sandbox";
  const modesToTry: PayPalMode[] = preferredMode === "live" ? ["live", "sandbox"] : ["sandbox", "live"];

  const failures: string[] = [];

  for (const mode of modesToTry) {
    const baseUrl = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (res.ok) {
      const data = await res.json();
      return { accessToken: data.access_token as string, baseUrl, mode };
    }

    const bodyText = await res.text();
    failures.push(`${mode}:${res.status}:${bodyText}`);
  }

  throw new Error(`PayPal auth failed in both environments. Verify PAYPAL_CLIENT_ID/PAYPAL_SECRET and PAYPAL_MODE. Details: ${failures.join(" | ")}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { amount, paypal_email } = body;

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Amount must be greater than 0" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!paypal_email) {
      return new Response(JSON.stringify({ error: "PayPal email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check balance using transactions (source of truth)
    const { data: txns } = await adminClient
      .from("transactions").select("type, amount, status").eq("user_id", userId);

    if (!txns) {
      return new Response(JSON.stringify({ error: "Could not fetch transactions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spent = txns.filter(t => t.type === "session_payment" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const earned = txns.filter(t => t.type === "session_earning" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const refunded = txns.filter(t => t.type === "refund" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const deposited = txns.filter(t => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const withdrawn = txns.filter(t => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const balance = deposited + earned + refunded - spent - withdrawn;

    if (balance < amount) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate fees
    const paypalPayoutFee = Math.min(Math.round(amount * PAYPAL_PAYOUT_RATE * 100) / 100, PAYPAL_PAYOUT_CAP);
    const totalFee = Math.round((WITHDRAWAL_FEE + paypalPayoutFee) * 100) / 100;
    const netAmount = Math.round((amount - totalFee) * 100) / 100;

    if (netAmount <= 0) {
      return new Response(JSON.stringify({ error: "Amount too small after fees" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send instant PayPal payout
    const { accessToken, baseUrl } = await getPayPalAuth();
    const batchId = `druxio_wd_${userId.slice(0, 8)}_${Date.now()}`;

    const payoutRes = await fetch(`${baseUrl}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: batchId,
          email_subject: "Your Druxio withdrawal has arrived!",
          email_message: `You've received €${netAmount.toFixed(2)} from your Druxio wallet.`,
        },
        items: [{
          recipient_type: "EMAIL",
          amount: { value: netAmount.toFixed(2), currency: "EUR" },
          receiver: paypal_email,
          note: `Druxio wallet withdrawal (€${amount.toFixed(2)} minus fees €${totalFee.toFixed(2)})`,
          sender_item_id: batchId,
        }],
      }),
    });

    if (!payoutRes.ok) {
      const errText = await payoutRes.text();
      console.error("PayPal payout error:", payoutRes.status, errText);
      throw new Error("PayPal payout failed. Please try again later.");
    }

    const payoutData = await payoutRes.json();
    const payoutBatchId = payoutData.batch_header?.payout_batch_id || batchId;

    // Record withdrawal transaction
    const description = `Withdrawal €${netAmount.toFixed(2)} to PayPal (${paypal_email}) — platform fee €${WITHDRAWAL_FEE.toFixed(2)}, PayPal fee €${paypalPayoutFee.toFixed(2)}`;

    const { data: transaction, error: txError } = await adminClient
      .from("transactions").insert({
        user_id: userId,
        amount,
        type: "withdrawal",
        status: "completed",
        description,
        stripe_payment_id: payoutBatchId,
      }).select().single();

    if (txError) {
      console.error("Transaction record error:", txError);
      // Payout already sent, so log but don't fail
    }

    // Create withdrawal record
    await adminClient.from("withdrawals").insert({
      user_id: userId,
      amount,
      method: "paypal",
      paypal_email,
      transaction_id: transaction?.id || null,
      status: "completed",
    });

    // In-app notification for successful withdrawal
    await adminClient.from("notifications").insert({
      user_id: userId,
      type: "withdrawal_completed",
      title: "Withdrawal successful! 💸",
      message: `€${netAmount.toFixed(2)} has been sent to your PayPal (${paypal_email}).`,
      data: { amount, netAmount, method: "paypal" },
    });
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const { data: userInfo } = await adminClient.auth.admin.getUserById(userId);
        const userEmail = userInfo?.user?.email;
        if (userEmail) {
          const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;text-align:center;">
        <span style="font-size:26px;font-weight:800;color:#fff;">Drux&#x26A1;o</span>
      </td></tr>
      <tr><td style="padding:32px 32px 24px;">
        <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Withdrawal sent! ✅</h2>
        <p style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.6;">Your funds have been sent to your PayPal account.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          <tr><td style="padding:8px 12px;font-size:14px;color:#6b7280;">Amount</td><td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">€${Number(amount).toFixed(2)}</td></tr>
          <tr><td style="padding:8px 12px;font-size:14px;color:#6b7280;">You received</td><td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">€${netAmount.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 12px;font-size:14px;color:#6b7280;">PayPal</td><td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">${paypal_email}</td></tr>
        </table>
        <a href="https://druxio.lovable.app/wallet" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Wallet</a>
      </td></tr>
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;"><a href="https://druxio.lovable.app" style="color:#7c3aed;text-decoration:none;">Visit Druxio</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Druxio <noreply@duxio.store>",
              to: userEmail,
              subject: `€${netAmount.toFixed(2)} sent to your PayPal ✅`,
              html,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      status: "completed",
      message: `€${netAmount.toFixed(2)} sent to ${paypal_email}!`,
      breakdown: { grossAmount: amount, withdrawalFee: WITHDRAWAL_FEE, paypalPayoutFee, totalFee, netAmount },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("paypal-withdraw error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
