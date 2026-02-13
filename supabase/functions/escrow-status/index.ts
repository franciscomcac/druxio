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

    const { data: job } = await serviceClient
      .from("jobs")
      .select("escrow_txn_id, escrow_status")
      .eq("id", jobId)
      .single();

    if (!job?.escrow_txn_id) {
      return new Response(JSON.stringify({ error: "No escrow transaction found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current status from Escrow.com
    const res = await fetch(`${ESCROW_API_BASE}/transaction/${job.escrow_txn_id}`, {
      headers: { Authorization: getEscrowAuth() },
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(`Escrow.com error [${res.status}]: ${JSON.stringify(errData)}`);
    }

    const txn = await res.json();

    // Determine status from Escrow.com transaction state
    let newStatus = job.escrow_status;
    const allAgreed = txn.parties?.every((p: any) => p.agreed === true);
    const statusId = txn.status?.id;

    if (statusId === "complete" || statusId === "complete_pending_disbursement") {
      newStatus = "completed";
    } else if (statusId === "received" || statusId === "accepted") {
      newStatus = "completed";
    } else if (statusId === "shipped" || statusId === "in_review") {
      newStatus = "delivered";
    } else if (statusId === "in_progress" || statusId === "funded") {
      newStatus = "funded";
    } else if (allAgreed && (statusId === "awaiting_payment" || statusId === "waiting")) {
      newStatus = "awaiting_funding";
    } else if (!allAgreed) {
      newStatus = "awaiting_agreement";
    }

    // Update if changed
    if (newStatus !== job.escrow_status) {
      await serviceClient
        .from("jobs")
        .update({ escrow_status: newStatus })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ success: true, escrow_status: newStatus, raw_status: statusId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Escrow status check error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
