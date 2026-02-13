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
  if (!res.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    const { orderId, quoteId, jobId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ppToken = await getPayPalToken();

    // Step 1: Authorize the order (buyer approved on PayPal)
    const authRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/authorize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ppToken}`,
        "Content-Type": "application/json",
      },
    });
    const authData = await authRes.json();
    if (!authRes.ok) {
      throw new Error(`PayPal authorize failed [${authRes.status}]: ${JSON.stringify(authData)}`);
    }

    const authorizationId =
      authData.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;

    if (!authorizationId) {
      throw new Error("No authorization ID returned from PayPal");
    }

    // Update transaction with authorization info
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Mark job as accepted, quote as accepted
    if (quoteId && jobId) {
      await serviceClient.from("jobs").update({ status: "accepted", accepted_quote_id: quoteId }).eq("id", jobId);
      await serviceClient.from("quotes").update({ status: "accepted" }).eq("id", quoteId);
    }

    // Store authorization ID for later capture
    await serviceClient
      .from("transactions")
      .update({
        description: `PayPal authorized — auth:${authorizationId}`,
      })
      .eq("stripe_payment_id", orderId);

    return new Response(
      JSON.stringify({ success: true, authorizationId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("PayPal capture error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
