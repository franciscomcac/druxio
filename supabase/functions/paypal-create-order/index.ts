import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_RATE = 0.05; // 5% buyer fee
const PAYPAL_RATE = 0.0349; // 3.49%
const PAYPAL_FIXED = 0.49; // €0.49

type PayPalMode = "live" | "sandbox";

const stripWrappingQuotes = (value: string) => value.replace(/^['"]+|['"]+$/g, "");

const getRequiredEnv = (name: "PAYPAL_CLIENT_ID" | "PAYPAL_SECRET") => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return stripWrappingQuotes(value);
};

async function fetchPayPalAccessToken(baseUrl: string, clientId: string, secret: string) {
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function getPayPalAuth() {
  const clientId = getRequiredEnv("PAYPAL_CLIENT_ID");
  const secret = getRequiredEnv("PAYPAL_SECRET");

  const rawMode = Deno.env.get("PAYPAL_MODE");
  console.log("paypal-create-order PAYPAL_MODE raw:", JSON.stringify(rawMode));
  const mode: PayPalMode = rawMode?.trim().toLowerCase() === "live" ? "live" : "sandbox";
  const baseUrl = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  try {
    const accessToken = await fetchPayPalAccessToken(baseUrl, clientId, secret);
    return { accessToken, baseUrl, mode };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("PayPal auth failed", {
      mode,
      clientIdPrefix: clientId.slice(0, 6),
      clientIdSuffix: clientId.slice(-4),
      secretLength: secret.length,
      error: message,
    });

    let modeHint = "";
    if (message.includes("invalid_client")) {
      const oppositeMode: PayPalMode = mode === "live" ? "sandbox" : "live";
      const oppositeBaseUrl =
        oppositeMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

      try {
        const fallbackAccessToken = await fetchPayPalAccessToken(oppositeBaseUrl, clientId, secret);
        console.warn(
          `PAYPAL_MODE resolved to '${mode}' but credentials authenticated in '${oppositeMode}'. Using '${oppositeMode}' for this request.`,
        );
        return { accessToken: fallbackAccessToken, baseUrl: oppositeBaseUrl, mode: oppositeMode };
      } catch (fallbackError) {
        console.error("PayPal fallback auth failed", {
          attemptedMode: oppositeMode,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
        modeHint = ` Credentials are valid in ${oppositeMode} mode. Set PAYPAL_MODE=${oppositeMode}.`;
      }
    }

    throw new Error(
      `PayPal auth failed in ${mode} mode: ${message}. Ensure PAYPAL_CLIENT_ID and PAYPAL_SECRET belong to the same ${mode} app.${modeHint}`,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const { quoteId, jobId, walletDeduction } = await req.json();

    if (!quoteId || !jobId) {
      return new Response(JSON.stringify({ error: "Missing quoteId or jobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job } = await supabase
      .from("jobs")
      .select("id, buyer_id, status, title")
      .eq("id", jobId)
      .single();

    if (!job || job.buyer_id !== userId) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: quote } = await supabase
      .from("quotes")
      .select("price, expert_id")
      .eq("id", quoteId)
      .single();

    if (!quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basePrice = Number(quote.price);
    const platformFee = Math.round(basePrice * PLATFORM_RATE * 100) / 100;
    const subtotal = Math.round((basePrice + platformFee) * 100) / 100;
    const paypalFee = Math.round((subtotal * PAYPAL_RATE + PAYPAL_FIXED) * 100) / 100;
    const totalBeforeWallet = Math.round((subtotal + paypalFee) * 100) / 100;

    // Validate wallet deduction
    const walletAmount = Math.max(0, Math.min(Number(walletDeduction) || 0, totalBeforeWallet));

    // Verify user actually has this balance
    if (walletAmount > 0) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: txns } = await serviceClient
        .from("transactions")
        .select("type, amount, status")
        .eq("user_id", userId)
        .eq("status", "completed");

      if (txns) {
        const deposited = txns.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0);
        const earned = txns.filter(t => t.type === "session_earning").reduce((s, t) => s + Number(t.amount), 0);
        const refunded = txns.filter(t => t.type === "refund").reduce((s, t) => s + Number(t.amount), 0);
        const spent = txns.filter(t => t.type === "session_payment").reduce((s, t) => s + Number(t.amount), 0);
        const withdrawn = txns.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0);
        const actualBalance = Math.round((deposited + earned + refunded - spent - withdrawn) * 100) / 100;

        if (walletAmount > actualBalance + 0.01) {
          return new Response(JSON.stringify({ error: "Insufficient wallet balance" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const paypalTotal = Math.round((totalBeforeWallet - walletAmount) * 100) / 100;

    // If wallet covers everything, skip PayPal entirely
    if (paypalTotal <= 0) {
      return new Response(
        JSON.stringify({
          paypalOrderId: null,
          orderId: null,
          walletOnly: true,
          mode: "wallet",
          breakdown: { basePrice, platformFee, total: totalBeforeWallet, walletDeduction: walletAmount, paypalTotal: 0 },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { accessToken, baseUrl, mode } = await getPayPalAuth();

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: jobId,
          description: job.title || "Service Payment",
          custom_id: JSON.stringify({
            job_id: jobId,
            quote_id: quoteId,
            buyer_id: userId,
            seller_id: quote.expert_id,
            wallet_deduction: walletAmount,
          }),
          amount: {
            currency_code: "EUR",
            value: paypalTotal.toFixed(2),
          },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              brand_name: "Druxio",
              locale: "en-US",
              user_action: "PAY_NOW",
            },
          },
        },
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error("PayPal create order error:", orderRes.status, errText);
      throw new Error(`PayPal order creation failed: ${orderRes.status} ${errText}`);
    }

    const orderData = await orderRes.json();

    return new Response(
      JSON.stringify({
        paypalOrderId: orderData.id,
        orderId: orderData.id,
        mode,
        breakdown: { basePrice, platformFee, total: totalBeforeWallet, walletDeduction: walletAmount, paypalTotal },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("paypal-create-order error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
