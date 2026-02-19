import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_API = "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
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

    const { paypalOrderId, quoteId, jobId } = await req.json();
    if (!paypalOrderId || !quoteId || !jobId) {
      return new Response(JSON.stringify({ error: "Missing paypalOrderId, quoteId, or jobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify job belongs to buyer
    const { data: job } = await supabase
      .from("jobs")
      .select("id, buyer_id")
      .eq("id", jobId)
      .single();

    if (!job || job.buyer_id !== userId) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Capture the PayPal order
    const accessToken = await getPayPalAccessToken();

    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureRes.json();
    if (!captureRes.ok || captureData.status !== "COMPLETED") {
      console.error("PayPal capture failed:", JSON.stringify(captureData));
      throw new Error(`PayPal capture failed: ${captureData.status || "unknown"}`);
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalOrderId;
    const capturedAmount = Number(
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || "0"
    );

    // Use service role for cross-user updates
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get quote for seller info
    const { data: quote } = await supabase
      .from("quotes")
      .select("price, expert_id")
      .eq("id", quoteId)
      .single();

    if (!quote) {
      throw new Error("Quote not found");
    }

    // Mark job as accepted and paid
    await serviceClient.from("jobs").update({
      status: "accepted",
      accepted_quote_id: quoteId,
      escrow_status: "paid",
    }).eq("id", jobId);

    // Mark quote as accepted
    await serviceClient.from("quotes").update({ status: "accepted" }).eq("id", quoteId);

    // NOTE: We do NOT insert a session_payment transaction here.
    // PayPal payments are external and do not go through the user's wallet balance.
    // Inserting a session_payment would incorrectly deduct from their wallet balance.
    // The payment is tracked via the job's escrow_status = "paid".

    // Create session for chat
    const { data: existingSession } = await serviceClient
      .from("sessions")
      .select("id")
      .eq("mentee_id", userId)
      .eq("mentor_id", quote.expert_id)
      .maybeSingle();

    if (!existingSession) {
      await serviceClient.from("sessions").insert({
        mentee_id: userId,
        mentor_id: quote.expert_id,
        status: "accepted",
        session_type: "chat",
        price: capturedAmount,
        categories: [],
        issue_description: `Job ${jobId}`,
      });
    }

    // Notify seller
    await serviceClient.from("notifications").insert({
      user_id: quote.expert_id,
      type: "order_accepted",
      title: "New order received! 💰",
      message: `A buyer has paid for your service. Start working on the delivery.`,
      data: { job_id: jobId, quote_id: quoteId },
    });

    return new Response(
      JSON.stringify({ success: true, captureId }),
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
