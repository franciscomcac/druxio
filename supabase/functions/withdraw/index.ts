import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Flat withdrawal/payout fee charged to seller
const WITHDRAWAL_FEE = 0.25; // €0.25 per withdrawal
// PayPal Payouts fee: 2% of amount, capped at €1.00 (EUR standard)
const PAYPAL_PAYOUT_RATE = 0.02;
const PAYPAL_PAYOUT_CAP = 1.00;

function calcWithdrawalFees(grossAmount: number, method: string) {
  let paypalPayoutFee = 0;
  if (method === "paypal") {
    paypalPayoutFee = Math.min(
      Math.round(grossAmount * PAYPAL_PAYOUT_RATE * 100) / 100,
      PAYPAL_PAYOUT_CAP
    );
  }

  const totalFee = Math.round((WITHDRAWAL_FEE + paypalPayoutFee) * 100) / 100;
  const netAmount = Math.round((grossAmount - totalFee) * 100) / 100;

  return { withdrawalFee: WITHDRAWAL_FEE, paypalPayoutFee, totalFee, netAmount };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { amount, method, paypal_email, crypto_token, crypto_network, crypto_address } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Amount must be greater than 0" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate method-specific fields
    if (method === "paypal" && !paypal_email) {
      return new Response(JSON.stringify({ error: "PayPal email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (method === "crypto" && (!crypto_token || !crypto_address)) {
      return new Response(JSON.stringify({ error: "Crypto token and wallet address are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: txns } = await adminClient
      .from("transactions")
      .select("type, amount, status")
      .eq("user_id", userId);

    if (!txns) {
      return new Response(JSON.stringify({ error: "Could not fetch transactions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spent = txns.filter(t => t.type === "session_payment" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
    const earned = txns.filter(t => t.type === "session_earning" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
    const refunded = txns.filter(t => t.type === "refund" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
    const deposited = txns.filter(t => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
    const withdrawn = txns.filter(t => t.type === "withdrawal" && ["completed", "pending"].includes(t.status)).reduce((s, t) => s + Number(t.amount), 0);
    const balance = Math.round((deposited + earned + refunded - spent - withdrawn) * 100) / 100;

    if (balance < amount) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { withdrawalFee, paypalPayoutFee, totalFee, netAmount } = calcWithdrawalFees(amount, method);

    // Build description
    const feeDetails = [`payout fee €${withdrawalFee.toFixed(2)}`];
    if (paypalPayoutFee > 0) feeDetails.push(`PayPal fee €${paypalPayoutFee.toFixed(2)}`);
    let description: string;
    if (method === "paypal") {
      description = `Withdrawal €${netAmount.toFixed(2)} to PayPal (${paypal_email}) — ${feeDetails.join(", ")}`;
    } else {
      description = `Withdrawal €${netAmount.toFixed(2)} to ${crypto_token} (${crypto_network}) — ${feeDetails.join(", ")}`;
    }

    // Create transaction record (pending)
    const { data: transaction, error: txError } = await adminClient
      .from("transactions")
      .insert({
        user_id: userId,
        amount,
        type: "withdrawal",
        status: "pending",
        description,
      })
      .select()
      .single();

    if (txError) {
      console.error("Transaction error:", txError);
      return new Response(JSON.stringify({ error: "Failed to create transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create withdrawal record — all withdrawals are pending for manual admin processing
    const { error: wdError } = await adminClient.from("withdrawals").insert({
      user_id: userId,
      amount,
      method,
      paypal_email: method === "paypal" ? paypal_email : null,
      crypto_token: method === "crypto" ? crypto_token : null,
      crypto_network: method === "crypto" ? crypto_network : null,
      crypto_address: method === "crypto" ? crypto_address : null,
      transaction_id: transaction.id,
      status: "pending",
    });

    if (wdError) {
      console.error("Withdrawal error:", wdError);
      return new Response(JSON.stringify({ error: "Failed to create withdrawal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send withdrawal confirmation email (fire-and-forget)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const { data: userData } = await adminClient.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email;
        if (userEmail) {
          const methodLabel = method === "paypal" ? `PayPal (${paypal_email})` : `${crypto_token} (${crypto_network})`;
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
        <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Withdrawal submitted ✅</h2>
        <p style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.6;">Your withdrawal request has been received and is being processed.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          <tr><td style="padding:8px 12px;font-size:14px;color:#6b7280;font-weight:500;">Amount requested</td><td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">€${Number(amount).toFixed(2)}</td></tr>
          <tr><td style="padding:8px 12px;font-size:14px;color:#6b7280;font-weight:500;">You will receive</td><td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">€${netAmount.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 12px;font-size:14px;color:#6b7280;font-weight:500;">Method</td><td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">${methodLabel}</td></tr>
          <tr><td style="padding:8px 12px;font-size:14px;color:#6b7280;font-weight:500;">Processing time</td><td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">24–48 hours</td></tr>
        </table>
        <p style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.6;">Our team will process your withdrawal manually. You'll be notified once it's completed.</p>
        <a href="https://druxio.lovable.app/wallet" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Wallet</a>
      </td></tr>
      <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you have an account on Druxio.<br/>
        <a href="https://druxio.lovable.app" style="color:#7c3aed;text-decoration:none;">Visit Druxio</a></p>
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
              subject: `Withdrawal of €${Number(amount).toFixed(2)} submitted ✅`,
              html,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        // Don't fail the withdrawal if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "pending",
        message: "Withdrawal submitted. It will be processed manually within 24-48h.",
        breakdown: { grossAmount: amount, withdrawalFee, paypalPayoutFee, totalFee, netAmount },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Withdraw error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
