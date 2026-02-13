import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ESCROW_API_BASE = "https://api.escrow-sandbox.com/2017-09-01";

function getEscrowAuth(): string {
  const email = Deno.env.get("ESCROW_EMAIL");
  const apiKey = Deno.env.get("ESCROW_API_KEY");
  if (!email || !apiKey) throw new Error("Escrow.com credentials not configured");
  return `Basic ${btoa(`${email}:${apiKey}`)}`;
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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get buyer and seller emails for Escrow.com
    const { data: buyerAuth } = await serviceClient.auth.admin.getUserById(userId);
    const { data: sellerAuth } = await serviceClient.auth.admin.getUserById(quote.expert_id);

    if (!buyerAuth?.user?.email || !sellerAuth?.user?.email) {
      throw new Error("Could not resolve buyer or seller email for Escrow.com");
    }

    // Apply 5% buyer fee
    const basePrice = Number(quote.price);
    const buyerFee = Math.round(basePrice * 0.05 * 100) / 100;
    const totalAmount = Math.round((basePrice + buyerFee) * 100) / 100;

    // Create Escrow.com transaction
    const escrowBody = {
      parties: [
        {
          role: "buyer",
          customer: buyerAuth.user.email,
        },
        {
          role: "seller",
          customer: sellerAuth.user.email,
        },
      ],
      currency: "eur",
      description: `Duxio service payment for job ${jobId}`,
      items: [
        {
          title: `Service quote ${quoteId}`,
          description: `Service delivery for job ${jobId}`,
          type: "general_merchandise",
          inspection_period: 259200, // 3 days in seconds
          quantity: 1,
          schedule: [
            {
              amount: totalAmount,
              payer_customer: buyerAuth.user.email,
              beneficiary_customer: sellerAuth.user.email,
            },
          ],
        },
      ],
    };

    const escrowRes = await fetch(`${ESCROW_API_BASE}/transaction`, {
      method: "POST",
      headers: {
        Authorization: getEscrowAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(escrowBody),
    });

    const escrowData = await escrowRes.json();
    if (!escrowRes.ok) {
      console.error("Escrow.com create transaction failed:", JSON.stringify(escrowData));
      throw new Error(`Escrow.com error [${escrowRes.status}]: ${JSON.stringify(escrowData)}`);
    }

    const escrowTxnId = escrowData.id;

    // Mark job as accepted, quote as accepted
    await serviceClient.from("jobs").update({ status: "accepted", accepted_quote_id: quoteId }).eq("id", jobId);
    await serviceClient.from("quotes").update({ status: "accepted" }).eq("id", quoteId);

    // Create pending transaction record
    await supabase.from("transactions").insert({
      user_id: userId,
      amount: totalAmount,
      type: "session_payment",
      status: "pending",
      description: `Escrow hold for quote ${quoteId}`,
      stripe_payment_id: String(escrowTxnId), // Store escrow transaction ID
    });

    // Create session for chat between buyer and seller
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
        price: totalAmount,
        categories: [],
        issue_description: `Job ${jobId}`,
      });
    }

    // Notify seller
    await serviceClient.from("notifications").insert({
      user_id: quote.expert_id,
      type: "order_accepted",
      title: "New order accepted!",
      message: `A buyer accepted your quote. Funds are held in escrow.`,
      data: { job_id: jobId, quote_id: quoteId, escrow_txn_id: escrowTxnId },
    });

    return new Response(
      JSON.stringify({ success: true, escrowTransactionId: escrowTxnId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Escrow checkout error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
