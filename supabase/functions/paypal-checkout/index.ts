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
    const userId = claimsData.claims.sub as string;

    const { quoteId, jobId } = await req.json();
    if (!quoteId || !jobId) {
      return new Response(JSON.stringify({ error: "Missing quoteId or jobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quote to get price
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("price, expert_id")
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply 5% buyer fee
    const basePrice = Number(quote.price);
    const buyerFee = Math.round(basePrice * 0.05 * 100) / 100;
    const totalAmount = Math.round((basePrice + buyerFee) * 100) / 100;

    // Create PayPal order with AUTHORIZE intent (escrow hold)
    const ppToken = await getPayPalToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ppToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [
          {
            reference_id: quoteId,
            description: `Service payment for quote ${quoteId}`,
            amount: {
              currency_code: "EUR",
              value: totalAmount.toFixed(2),
              breakdown: {
                item_total: { currency_code: "EUR", value: basePrice.toFixed(2) },
                handling: { currency_code: "EUR", value: buyerFee.toFixed(2) },
              },
            },
          },
        ],
        application_context: {
          brand_name: "Duxio",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(`PayPal create order failed [${orderRes.status}]: ${JSON.stringify(order)}`);
    }

    // Create a pending transaction record
    await supabase.from("transactions").insert({
      user_id: userId,
      amount: totalAmount,
      type: "session_payment",
      status: "pending",
      description: `PayPal escrow hold for quote ${quoteId}`,
      stripe_payment_id: order.id, // Reuse field for PayPal order ID
    });

    return new Response(
      JSON.stringify({ orderId: order.id, approvalUrl: order.links?.find((l: any) => l.rel === "approve")?.href }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("PayPal checkout error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
