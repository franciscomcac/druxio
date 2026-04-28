import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PayPalMode = "live" | "sandbox";

async function getPayPalAuth() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const preferredMode: PayPalMode = Deno.env.get("PAYPAL_MODE") === "live" ? "live" : "sandbox";
  const modesToTry: PayPalMode[] = preferredMode === "live" ? ["live", "sandbox"] : ["sandbox", "live"];

  let lastError = "";

  for (const mode of modesToTry) {
    const baseUrl = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (res.ok) {
      const data = await res.json();
      return { accessToken: data.access_token as string, baseUrl, mode };
    }

    const text = await res.text();
    lastError = `PayPal auth failed in ${mode} mode: ${res.status} ${text}`;
    console.error(lastError);
  }

  throw new Error(lastError || "PayPal auth failed");
}

const PLATFORM_FEE_RATE = 0.05; // 5% seller fee

async function processWalletDeduction(serviceClient: any, userId: string, walletDeduction: number, jobId: string) {
  if (walletDeduction <= 0) return;

  // Create a session_payment transaction for the wallet portion
  await serviceClient.from("transactions").insert({
    user_id: userId,
    amount: walletDeduction,
    type: "session_payment",
    status: "completed",
    description: `Wallet balance applied to order`,
    stripe_payment_id: `wallet_${jobId}`,
  });
}

async function finalizeOrder(serviceClient: any, userId: string, jobId: string, quoteId: string, totalPaid: number, captureId: string | null, walletDeduction: number) {
  const { data: quote } = await serviceClient
    .from("quotes").select("price, expert_id, estimated_minutes").eq("id", quoteId).single();
  if (!quote) throw new Error("Quote not found");

  await serviceClient.from("quotes").update({ status: "accepted" }).eq("id", quoteId);
  await serviceClient.from("quotes").update({ status: "rejected" })
    .eq("job_id", jobId).neq("id", quoteId).eq("status", "pending");

  await serviceClient.from("jobs").update({
    status: "accepted",
    accepted_quote_id: quoteId,
    escrow_status: "funded",
    stripe_payment_intent_id: captureId || `wallet_only_${jobId}`,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);

  // NOTE: PayPal payments are external money — do NOT record as session_payment
  // which would incorrectly deduct from wallet balance. Only wallet deductions
  // should create session_payment transactions.

  // Record wallet deduction transaction
  await processWalletDeduction(serviceClient, userId, walletDeduction, jobId);

  const { data: job } = await serviceClient.from("jobs").select("title, description, category, subcategory, deadline_minutes").eq("id", jobId).single();

  const { data: quoteSession } = job ? await serviceClient
    .from("sessions")
    .select("id, categories")
    .eq("mentee_id", userId)
    .eq("mentor_id", quote.expert_id)
    .contains("categories", [job.category])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() : { data: null };

  const { data: newSession } = quoteSession
    ? await serviceClient.from("sessions").update({
        status: "accepted",
        duration_minutes: quote.estimated_minutes,
        price: Number(quote.price),
        issue_description: jobId,
        categories: Array.from(new Set([...(quoteSession.categories || []), jobId])),
      }).eq("id", quoteSession.id).select("id").single()
    : await serviceClient.from("sessions").insert({
        mentee_id: userId,
        mentor_id: quote.expert_id,
        status: "accepted",
        duration_minutes: quote.estimated_minutes,
        price: Number(quote.price),
        session_type: "chat",
        issue_description: jobId,
        categories: [job?.category, jobId].filter(Boolean),
      }).select("id").single();

  if (newSession && job) {
    const orderDetailsMsg = `📋 **Order Details**\n\n**${job.title}**\n${job.description || ""}\n\n📂 ${job.category}${job.subcategory ? ` › ${job.subcategory}` : ""}\n💰 €${Number(quote.price).toFixed(2)}\n⏱️ ${quote.estimated_minutes} min delivery`;
    const sellerMsg = `✅ I've accepted this order and will start working on it right away!`;

    await serviceClient.from("messages").insert([
      { session_id: newSession.id, sender_id: userId, content: orderDetailsMsg },
      { session_id: newSession.id, sender_id: quote.expert_id, content: sellerMsg },
    ]);
  }

  await serviceClient.from("notifications").insert({
    user_id: quote.expert_id,
    type: "quote_accepted",
    title: "Quote accepted! 🎉",
    message: `Your quote for "${job?.title || "a request"}" has been accepted. Start working now!`,
    data: { job_id: jobId, quote_id: quoteId },
  });

  return quote;
}

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

    const { paypalOrderId, jobId, quoteId, walletDeduction: walletDeductionInput, walletOnly } = await req.json();
    if (!jobId || !quoteId) {
      return new Response(JSON.stringify({ error: "Missing jobId or quoteId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const walletDeduction = Math.max(0, Number(walletDeductionInput) || 0);

    // Wallet-only payment (no PayPal needed)
    if (walletOnly && !paypalOrderId) {
      // Verify balance again server-side
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

        if (walletDeduction > actualBalance + 0.01) {
          return new Response(JSON.stringify({ error: "Insufficient wallet balance" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      await finalizeOrder(serviceClient, userId, jobId, quoteId, 0, null, walletDeduction);

      return new Response(JSON.stringify({
        success: true,
        captureId: `wallet_only_${jobId}`,
        sellerFeeRate: PLATFORM_FEE_RATE,
        walletDeduction,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PayPal + optional wallet deduction
    if (!paypalOrderId) {
      return new Response(JSON.stringify({ error: "Missing paypalOrderId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { accessToken, baseUrl } = await getPayPalAuth();

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
      throw new Error(`PayPal capture failed: ${captureRes.status} ${errText}`);
    }

    const captureData = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
      return new Response(JSON.stringify({ error: "Payment not completed", status: captureData.status }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    const totalPaid = Number(captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0);

    await finalizeOrder(serviceClient, userId, jobId, quoteId, totalPaid, captureId, walletDeduction);

    return new Response(JSON.stringify({
      success: true,
      captureId,
      sellerFeeRate: PLATFORM_FEE_RATE,
      walletDeduction,
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
