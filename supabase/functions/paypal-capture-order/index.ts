import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const baseUrl = Deno.env.get("PAYPAL_MODE") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

const PLATFORM_FEE_RATE = 0.05; // 5% seller fee

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { paypalOrderId, jobId, quoteId } = await req.json();
    if (!paypalOrderId || !jobId || !quoteId) {
      return new Response(JSON.stringify({ error: "Missing paypalOrderId, jobId, or quoteId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("PAYPAL_MODE") === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    const accessToken = await getPayPalAccessToken();

    // Capture the PayPal order
    const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!captureRes.ok) {
      const errText = await captureRes.text();
      console.error("PayPal capture error:", captureRes.status, errText);
      throw new Error(`PayPal capture failed: ${captureRes.status}`);
    }

    const captureData = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "Payment not completed", status: captureData.status }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get capture ID for potential refunds
    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    // Use service role to update job/quote status
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get quote details
    const { data: quote } = await serviceClient
      .from("quotes").select("price, expert_id, estimated_minutes").eq("id", quoteId).single();
    if (!quote) throw new Error("Quote not found");

    // Accept quote and update job
    await serviceClient.from("quotes").update({ status: "accepted" }).eq("id", quoteId);
    // Reject other quotes for same job
    await serviceClient.from("quotes").update({ status: "rejected" })
      .eq("job_id", jobId).neq("id", quoteId).eq("status", "pending");

    await serviceClient.from("jobs").update({
      status: "in_progress",
      accepted_quote_id: quoteId,
      escrow_status: "funded",
      stripe_payment_intent_id: captureId, // Reusing this field for PayPal capture ID
    }).eq("id", jobId);

    // Record payment transaction for buyer
    const totalPaid = Number(captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || quote.price);
    await serviceClient.from("transactions").insert({
      user_id: userId,
      amount: totalPaid,
      type: "session_payment",
      status: "completed",
      description: `Payment for service via PayPal`,
      stripe_payment_id: captureId,
    });

    // Create session for chat
    const { data: existingSession } = await serviceClient
      .from("sessions").select("id")
      .eq("mentee_id", userId).eq("mentor_id", quote.expert_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!existingSession) {
      await serviceClient.from("sessions").insert({
        mentee_id: userId,
        mentor_id: quote.expert_id,
        status: "accepted",
        duration_minutes: quote.estimated_minutes,
        price: Number(quote.price),
        session_type: "chat",
      });
    }

    // Notify seller
    const { data: job } = await serviceClient.from("jobs").select("title").eq("id", jobId).single();
    await serviceClient.from("notifications").insert({
      user_id: quote.expert_id,
      type: "quote_accepted",
      title: "Quote accepted! 🎉",
      message: `Your quote for "${job?.title || 'a request'}" has been accepted. Start working now!`,
      data: { job_id: jobId, quote_id: quoteId },
    });

    return new Response(JSON.stringify({
      success: true,
      captureId,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paypal-capture-order error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
