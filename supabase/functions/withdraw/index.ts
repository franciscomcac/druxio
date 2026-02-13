import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { amount, method, paypal_email, crypto_token, crypto_network, crypto_address } = body;

    // Validate amount
    if (!amount || amount < 1) {
      return new Response(JSON.stringify({ error: "Minimum withdrawal is €1.00" }), {
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

    // Use service role to check balance and create records
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check balance
    const { data: profile } = await adminClient
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.wallet_balance || 0) < amount) {
      return new Response(JSON.stringify({ error: "Insufficient balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create transaction record
    const { data: transaction, error: txError } = await adminClient
      .from("transactions")
      .insert({
        user_id: user.id,
        amount,
        type: "withdrawal",
        status: "pending",
        description: method === "paypal"
          ? `Withdrawal to PayPal (${paypal_email})`
          : `Withdrawal to ${crypto_token} (${crypto_network})`,
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

    // Create withdrawal record
    const { error: wdError } = await adminClient.from("withdrawals").insert({
      user_id: user.id,
      amount,
      method,
      paypal_email: method === "paypal" ? paypal_email : null,
      crypto_token: method === "crypto" ? crypto_token : null,
      crypto_network: method === "crypto" ? crypto_network : null,
      crypto_address: method === "crypto" ? crypto_address : null,
      transaction_id: transaction.id,
      status: "processing",
    });

    if (wdError) {
      console.error("Withdrawal error:", wdError);
      return new Response(JSON.stringify({ error: "Failed to create withdrawal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct from wallet balance
    await adminClient
      .from("profiles")
      .update({ wallet_balance: (profile.wallet_balance || 0) - amount })
      .eq("id", user.id);

    // Mark transaction as completed
    await adminClient
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", transaction.id);

    // Update withdrawal status
    await adminClient
      .from("withdrawals")
      .update({ status: "completed" })
      .eq("transaction_id", transaction.id);

    return new Response(
      JSON.stringify({ success: true, withdrawal_id: transaction.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Withdraw error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
