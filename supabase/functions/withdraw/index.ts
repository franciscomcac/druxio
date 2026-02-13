import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_BASE = "https://api-m.paypal.com";

async function getPayPalToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  console.log("PayPal token response scope:", data.scope);
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sendPayPalPayout(token: string, email: string, amount: number, withdrawalId: string) {
  const res = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `WD_${withdrawalId}_${Date.now()}`,
        email_subject: "You have a payout from Duxio!",
        email_message: "Your withdrawal has been processed.",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: amount.toFixed(2),
            currency: "EUR",
          },
          receiver: email,
          note: `Duxio withdrawal ${withdrawalId}`,
          sender_item_id: withdrawalId,
        },
      ],
    }),
  });

  const data = await res.json();
  console.log("PayPal Payout full response:", JSON.stringify(data));
  console.log("PayPal Payout status:", res.status);
  if (!res.ok) {
    console.error("PayPal Payout error details:", JSON.stringify(data));
    throw new Error(`PayPal Payout failed: ${data.message || data.error_description || JSON.stringify(data)}`);
  }
  return data;
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
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

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

    // Check balance
    const { data: profile } = await adminClient
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .single();

    if (!profile || (profile.wallet_balance || 0) < amount) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate fee for PayPal
    const feeRate = method === "paypal" ? 0.02 : 0;
    const fee = Math.round(amount * feeRate * 100) / 100;
    const netAmount = Math.round((amount - fee) * 100) / 100;

    // Deduct full amount from wallet
    await adminClient
      .from("profiles")
      .update({ wallet_balance: (profile.wallet_balance || 0) - amount })
      .eq("id", userId);

    // Create transaction record (pending)
    const { data: transaction, error: txError } = await adminClient
      .from("transactions")
      .insert({
        user_id: userId,
        amount,
        type: "withdrawal",
        status: "pending",
        description: method === "paypal"
          ? `Withdrawal €${netAmount.toFixed(2)} to PayPal (${paypal_email}) — €${fee.toFixed(2)} fee`
          : `Withdrawal to ${crypto_token} (${crypto_network})`,
      })
      .select()
      .single();

    if (txError) {
      // Rollback balance
      await adminClient
        .from("profiles")
        .update({ wallet_balance: (profile.wallet_balance || 0) })
        .eq("id", userId);
      console.error("Transaction error:", txError);
      return new Response(JSON.stringify({ error: "Failed to create transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create withdrawal record
    const { data: withdrawal, error: wdError } = await adminClient.from("withdrawals").insert({
      user_id: userId,
      amount,
      method,
      paypal_email: method === "paypal" ? paypal_email : null,
      crypto_token: method === "crypto" ? crypto_token : null,
      crypto_network: method === "crypto" ? crypto_network : null,
      crypto_address: method === "crypto" ? crypto_address : null,
      transaction_id: transaction.id,
      status: "pending",
    }).select().single();

    if (wdError) {
      console.error("Withdrawal error:", wdError);
      return new Response(JSON.stringify({ error: "Failed to create withdrawal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For PayPal: auto-process via Payouts API
    if (method === "paypal") {
      try {
        const ppToken = await getPayPalToken();
        const payoutResult = await sendPayPalPayout(ppToken, paypal_email, netAmount, withdrawal.id);

        const batchId = payoutResult?.batch_header?.payout_batch_id || null;

        // Mark as completed
        await adminClient
          .from("transactions")
          .update({ status: "completed", stripe_payment_id: batchId })
          .eq("id", transaction.id);

        await adminClient
          .from("withdrawals")
          .update({ status: "completed", admin_notes: `PayPal batch: ${batchId}` })
          .eq("id", withdrawal.id);

        return new Response(
          JSON.stringify({ success: true, status: "completed", payout_batch_id: batchId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (ppErr) {
        console.error("PayPal payout failed:", ppErr);

        // Mark as failed, refund balance
        await adminClient
          .from("transactions")
          .update({ status: "failed" })
          .eq("id", transaction.id);

        await adminClient
          .from("withdrawals")
          .update({ status: "failed", admin_notes: `PayPal error: ${ppErr.message}` })
          .eq("id", withdrawal.id);

        await adminClient
          .from("profiles")
          .update({ wallet_balance: (profile.wallet_balance || 0) })
          .eq("id", userId);

        return new Response(
          JSON.stringify({ error: `PayPal payout failed: ${ppErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For crypto: stays pending for manual processing
    return new Response(
      JSON.stringify({ success: true, status: "pending", message: "Crypto withdrawal submitted. Processing may take 24-48h." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Withdraw error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
