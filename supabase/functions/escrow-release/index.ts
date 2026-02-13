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

    const { jobId, quoteId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing jobId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the escrow transaction ID from our transactions table
    const { data: txns } = await serviceClient
      .from("transactions")
      .select("*")
      .ilike("description", "%Escrow hold%")
      .eq("type", "session_payment")
      .eq("status", "pending");

    let escrowTxnId: string | null = null;
    let txnRecord: any = null;

    if (txns) {
      for (const txn of txns) {
        if (txn.stripe_payment_id) {
          escrowTxnId = txn.stripe_payment_id;
          txnRecord = txn;
          break;
        }
      }
    }

    // If we have an escrow transaction, mark items as received (releases funds)
    if (escrowTxnId) {
      try {
        // Patch the transaction to mark item as received by buyer
        const patchRes = await fetch(
          `${ESCROW_API_BASE}/transaction/${escrowTxnId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: getEscrowAuth(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "receive",
            }),
          }
        );
        const patchData = await patchRes.json();
        if (!patchRes.ok) {
          console.error("Escrow release API error:", JSON.stringify(patchData));
          // Don't throw — still mark as completed internally
        }
      } catch (escrowErr) {
        console.error("Escrow API call failed, continuing with internal completion:", escrowErr);
      }

      // Mark transaction as completed
      if (txnRecord) {
        await serviceClient
          .from("transactions")
          .update({ status: "completed", description: `Escrow released for job ${jobId}` })
          .eq("id", txnRecord.id);
      }
    }

    // Credit seller's wallet (minus 5% seller fee)
    if (quoteId) {
      const { data: quote } = await serviceClient
        .from("quotes")
        .select("price, expert_id")
        .eq("id", quoteId)
        .single();

      if (quote) {
        const sellerAmount = Math.round(Number(quote.price) * 0.95 * 100) / 100;

        // Create earning record
        await serviceClient.from("transactions").insert({
          user_id: quote.expert_id,
          amount: sellerAmount,
          type: "session_earning",
          status: "completed",
          description: `Earning for job ${jobId} (5% fee deducted)`,
        });

        // Credit seller wallet
        const { data: sellerProfile } = await serviceClient
          .from("profiles")
          .select("wallet_balance")
          .eq("id", quote.expert_id)
          .single();

        if (sellerProfile) {
          await serviceClient
            .from("profiles")
            .update({ wallet_balance: (sellerProfile.wallet_balance || 0) + sellerAmount })
            .eq("id", quote.expert_id);
        }

        // Notify seller
        await serviceClient.from("notifications").insert({
          user_id: quote.expert_id,
          type: "payment_released",
          title: "Payment released! 💰",
          message: `€${sellerAmount.toFixed(2)} has been added to your wallet.`,
          data: { job_id: jobId },
        });
      }
    }

    // Mark job as completed
    await serviceClient.from("jobs").update({ status: "completed" }).eq("id", jobId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Escrow release error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
