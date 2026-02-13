import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";

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
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { authorizationId, quoteId } = await req.json();
    if (!authorizationId) {
      return new Response(JSON.stringify({ error: "Missing authorizationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ppToken = await getPayPalToken();

    // Capture the authorized payment (release escrow to seller minus 5% seller fee)
    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/payments/authorizations/${authorizationId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ppToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const captureData = await captureRes.json();
    if (!captureRes.ok) {
      throw new Error(`PayPal capture failed [${captureRes.status}]: ${JSON.stringify(captureData)}`);
    }

    // Update transaction to completed
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the transaction by authorization ID in description
    const { data: txns } = await serviceClient
      .from("transactions")
      .select("*")
      .ilike("description", `%auth:${authorizationId}%`)
      .limit(1);

    if (txns && txns.length > 0) {
      await serviceClient
        .from("transactions")
        .update({ status: "completed", description: `PayPal captured — ${captureData.id}` })
        .eq("id", txns[0].id);

      // Create seller earning record (minus 5% seller fee)
      if (quoteId) {
        const { data: quote } = await serviceClient
          .from("quotes")
          .select("price, expert_id")
          .eq("id", quoteId)
          .single();

        if (quote) {
          const sellerAmount = Math.round(Number(quote.price) * 0.95 * 100) / 100;
          await serviceClient.from("transactions").insert({
            user_id: quote.expert_id,
            amount: sellerAmount,
            type: "session_earning",
            status: "completed",
            description: `Payout for quote ${quoteId} (5% fee deducted)`,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, captureId: captureData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("PayPal release error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
