import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Calculate fee for PayPal withdrawals
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

    return new Response(
      JSON.stringify({
        success: true,
        status: "pending",
        message: "Withdrawal submitted. It will be processed manually within 24-48h.",
      }),
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
