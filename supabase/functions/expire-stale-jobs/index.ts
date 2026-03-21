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

    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    // 1a. Find open jobs older than 24h that have NO quotes (close quickly)
    const { data: allOpenJobs, error: openErr } = await supabase
      .from("jobs")
      .select("id, buyer_id, title, created_at")
      .eq("status", "open")
      .lt("created_at", oneDayAgo);

    if (openErr) throw openErr;

    // Check which of these jobs have quotes
    const openJobIds = (allOpenJobs || []).map(j => j.id);
    let staleOpenJobsNoQuotes: typeof allOpenJobs = [];
    let staleOpenJobsWithQuotes: typeof allOpenJobs = [];

    if (openJobIds.length > 0) {
      const { data: quotedJobRows } = await supabase
        .from("quotes")
        .select("job_id")
        .in("job_id", openJobIds);

      const quotedJobIds = new Set((quotedJobRows || []).map(q => q.job_id));
      staleOpenJobsNoQuotes = (allOpenJobs || []).filter(j => !quotedJobIds.has(j.id));
      // Jobs with quotes only expire after 5 days
      const fiveDayThreshold = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      staleOpenJobsWithQuotes = (allOpenJobs || []).filter(j => quotedJobIds.has(j.id) && new Date(j.created_at) < fiveDayThreshold);
    }

    const staleOpenJobs = [...(staleOpenJobsNoQuotes || []), ...(staleOpenJobsWithQuotes || [])];

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

    let expiredJobCount = 0;

    if (expiredJobIds.length > 0) {
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

      expiredJobCount = expiredJobIds.length;
      console.log(`Expired ${expiredJobCount} stale jobs: ${expiredJobIds.join(", ")}`);
    }

    // ── Auto-expire individual pending quotes older than 5 days ──────────
    // These are quotes on jobs that are still open but the buyer hasn't responded to the specific quote
    const { data: staleQuotes, error: staleQuotesErr } = await supabase
      .from("quotes")
      .select("id, expert_id, job_id")
      .eq("status", "pending")
      .lt("created_at", fiveDaysAgo);

    if (staleQuotesErr) throw staleQuotesErr;

    let expiredQuoteCount = 0;

    if (staleQuotes && staleQuotes.length > 0) {
      // Only expire quotes whose jobs are still open (not already expired above)
      const quoteJobIds = [...new Set(staleQuotes.map(q => q.job_id))];
      const { data: stillOpenJobs } = await supabase
        .from("jobs")
        .select("id, title")
        .in("id", quoteJobIds)
        .eq("status", "open");

      const openJobMap = new Map((stillOpenJobs || []).map(j => [j.id, j.title]));
      const quotesToExpire = staleQuotes.filter(q => openJobMap.has(q.job_id));

      if (quotesToExpire.length > 0) {
        const quoteIds = quotesToExpire.map(q => q.id);
        const { error: expireErr } = await supabase
          .from("quotes")
          .update({ status: "expired" })
          .in("id", quoteIds);

        if (expireErr) throw expireErr;

        // Notify each seller
        const sellerNotifications = quotesToExpire.map(q => ({
          user_id: q.expert_id,
          type: "quote_expired",
          title: "Quote Expired",
          message: `Your quote on "${openJobMap.get(q.job_id)}" expired after 5 days without a response.`,
          data: { job_id: q.job_id },
        }));

        await supabase.from("notifications").insert(sellerNotifications);

        expiredQuoteCount = quotesToExpire.length;
        console.log(`Expired ${expiredQuoteCount} stale quotes`);
      }
    }

    return new Response(
      JSON.stringify({ expired_jobs: expiredJobCount, expired_quotes: expiredQuoteCount }),
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
