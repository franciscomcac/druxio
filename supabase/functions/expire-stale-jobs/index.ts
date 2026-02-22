import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Find open jobs older than 5 days
    const { data: staleOpenJobs, error: openErr } = await supabase
      .from("jobs")
      .select("id, buyer_id, title")
      .eq("status", "open")
      .lt("created_at", fiveDaysAgo);

    if (openErr) throw openErr;

    // 2. Find accepted jobs (quote accepted but no payment/escrow) older than 5 days
    const { data: staleAcceptedJobs, error: acceptedErr } = await supabase
      .from("jobs")
      .select("id, buyer_id, title, accepted_quote_id")
      .eq("status", "accepted")
      .is("escrow_status", null)
      .lt("updated_at", fiveDaysAgo);

    if (acceptedErr) throw acceptedErr;

    const allStaleJobs = [...(staleOpenJobs || []), ...(staleAcceptedJobs || [])];
    const expiredJobIds = allStaleJobs.map((j) => j.id);

    if (expiredJobIds.length === 0) {
      return new Response(JSON.stringify({ expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Expire the jobs
    const { error: jobUpdateErr } = await supabase
      .from("jobs")
      .update({ status: "expired" })
      .in("id", expiredJobIds);

    if (jobUpdateErr) throw jobUpdateErr;

    // 4. Reject all pending quotes on those jobs
    const { error: quoteUpdateErr } = await supabase
      .from("quotes")
      .update({ status: "rejected" })
      .in("job_id", expiredJobIds)
      .in("status", ["pending", "accepted"]);

    if (quoteUpdateErr) throw quoteUpdateErr;

    // 5. Notify buyers
    const notifications = allStaleJobs.map((job) => ({
      user_id: job.buyer_id,
      type: "job_expired",
      title: "Request Expired",
      message: `Your request "${job.title}" was closed after 5 days without payment.`,
      data: { job_id: job.id },
    }));

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    console.log(`Expired ${expiredJobIds.length} stale jobs: ${expiredJobIds.join(", ")}`);

    return new Response(
      JSON.stringify({ expired: expiredJobIds.length, job_ids: expiredJobIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("expire-stale-jobs error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
