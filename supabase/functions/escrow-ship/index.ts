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

    const { jobId } = await req.json();
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

    // Get job with escrow info
    const { data: job, error: jobErr } = await serviceClient
      .from("jobs")
      .select("escrow_txn_id, escrow_status, accepted_quote_id")
      .eq("id", jobId)
      .single();

    if (jobErr || !job || !job.escrow_txn_id) {
      return new Response(JSON.stringify({ error: "Job or escrow transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is the seller
    const { data: quote } = await serviceClient
      .from("quotes")
      .select("expert_id")
      .eq("id", job.accepted_quote_id)
      .single();

    if (!quote || quote.expert_id !== userId) {
      return new Response(JSON.stringify({ error: "Only the seller can mark as delivered" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Escrow.com API to ship (mark as delivered by seller)
    const patchRes = await fetch(
      `${ESCROW_API_BASE}/transaction/${job.escrow_txn_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: getEscrowAuth(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "ship" }),
      }
    );

    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      console.error("Escrow ship API error:", JSON.stringify(patchData));
      throw new Error(`Escrow.com error [${patchRes.status}]: ${JSON.stringify(patchData)}`);
    }

    // Update job escrow status
    await serviceClient
      .from("jobs")
      .update({ escrow_status: "delivered" })
      .eq("id", jobId);

    // Notify buyer that delivery was shipped
    const { data: jobFull } = await serviceClient
      .from("jobs")
      .select("buyer_id")
      .eq("id", jobId)
      .single();

    if (jobFull) {
      await serviceClient.from("notifications").insert({
        user_id: jobFull.buyer_id,
        type: "delivery_shipped",
        title: "Seller has delivered! 📦",
        message: "The seller has marked the order as delivered. Please review and accept.",
        data: { job_id: jobId },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Escrow ship error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
