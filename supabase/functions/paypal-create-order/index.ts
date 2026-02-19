import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_API = "https://api-m.sandbox.paypal.com";

// PayPal standard online checkout fee: 3.49% + €0.35 (EUR transactions)
const PAYPAL_RATE = 0.0349;
const PAYPAL_FIXED = 0.35;

// Platform fee charged to the buyer
const PLATFORM_RATE = 0.05;

function calcBuyerTotal(basePrice: number) {
  const platformFee = Math.round(basePrice * PLATFORM_RATE * 100) / 100;
  const paypalFee = Math.round((basePrice * PAYPAL_RATE + PAYPAL_FIXED) * 100) / 100;
  const total = Math.round((basePrice + platformFee + paypalFee) * 100) / 100;
  return { platformFee, paypalFee, total };
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");

  // DEBUG: log credential info (first 8 chars + length) so we can diagnose
  console.log(`[PayPal Debug] API URL: ${PAYPAL_API}`);
  console.log(`[PayPal Debug] Client ID present: ${!!clientId}, prefix: ${clientId?.slice(0, 8)}, length: ${clientId?.length}`);
  console.log(`[PayPal Debug] Secret present: ${!!secret}, prefix: ${secret?.slice(0, 8)}, length: ${secret?.length}`);

  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const authString = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
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

    // Verify the job belongs to this buyer
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, buyer_id, status")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.buyer_id !== userId) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quote
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

    const basePrice = Number(quote.price);
    const { platformFee, paypalFee, total } = calcBuyerTotal(basePrice);

    // Create PayPal order
    const accessToken = await getPayPalAccessToken();

    const paypalRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: jobId,
            description: `Duxio service payment`,
            amount: {
              currency_code: "EUR",
              value: total.toFixed(2),
              breakdown: {
                item_total: {
                  currency_code: "EUR",
                  value: basePrice.toFixed(2),
                },
                handling: {
                  currency_code: "EUR",
                  value: platformFee.toFixed(2),
                },
                insurance: {
                  currency_code: "EUR",
                  value: paypalFee.toFixed(2),
                },
              },
            },
            items: [
              {
                name: "Service Payment",
                quantity: "1",
                unit_amount: {
                  currency_code: "EUR",
                  value: basePrice.toFixed(2),
                },
                category: "DIGITAL_GOODS",
              },
            ],
          },
        ],
      }),
    });

    const paypalData = await paypalRes.json();
    if (!paypalRes.ok) {
      console.error("PayPal create order failed:", JSON.stringify(paypalData));
      throw new Error(`PayPal error: ${JSON.stringify(paypalData)}`);
    }

    const approvalUrl = paypalData.links?.find((l: any) => l.rel === "approve")?.href;

    return new Response(
      JSON.stringify({
        success: true,
        paypalOrderId: paypalData.id,
        approvalUrl,
        quoteId,
        jobId,
        breakdown: { basePrice, platformFee, paypalFee, total },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("PayPal create order error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
