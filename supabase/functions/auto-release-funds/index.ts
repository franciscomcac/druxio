import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Find all jobs that were delivered more than 3 days ago and still awaiting confirmation
    const { data: eligibleJobs, error } = await supabase
      .from("jobs")
      .select("id, buyer_id, title, accepted_quote_id")
      .eq("escrow_status", "delivered")
      .eq("status", "in_progress")
      .lt("delivered_at", THREE_DAYS_AGO);

    if (error) throw error;
    if (!eligibleJobs || eligibleJobs.length === 0) {
      return new Response(JSON.stringify({ released: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let released = 0;

    for (const job of eligibleJobs) {
      try {
        // Get the accepted quote
        const { data: quote } = await supabase
          .from("quotes")
          .select("*")
          .eq("job_id", job.id)
          .eq("status", "accepted")
          .maybeSingle();

        if (!quote) continue;

        const servicePrice = Number(quote.price);
        const sellerEarning = Math.round(servicePrice * 0.95 * 100) / 100;

        // Credit seller wallet
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", quote.expert_id)
          .single();

        const currentBalance = Number(sellerProfile?.wallet_balance || 0);
        await supabase
          .from("profiles")
          .update({ wallet_balance: currentBalance + sellerEarning })
          .eq("id", quote.expert_id);

        // Record earning transaction
        await supabase.from("transactions").insert({
          user_id: quote.expert_id,
          amount: sellerEarning,
          type: "session_earning",
          status: "completed",
          description: `Auto-released: job ${job.id} (buyer did not confirm within 3 days)`,
        });

        // Mark job completed
        await supabase
          .from("jobs")
          .update({ status: "completed", escrow_status: "completed" })
          .eq("id", job.id);

        // Mark session completed
        const { data: session } = await supabase
          .from("sessions")
          .select("id")
          .eq("mentee_id", job.buyer_id)
          .eq("mentor_id", quote.expert_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session) {
          await supabase.from("sessions").update({ status: "completed" }).eq("id", session.id);

          // Auto-submit 5-star review on behalf of the buyer
          const { data: existingReview } = await supabase
            .from("reviews")
            .select("id")
            .eq("session_id", session.id)
            .eq("reviewer_id", job.buyer_id)
            .maybeSingle();

          if (!existingReview) {
            await supabase.from("reviews").insert({
              session_id: session.id,
              reviewer_id: job.buyer_id,
              reviewee_id: quote.expert_id,
              rating: 5,
              comment: "Order auto-completed — buyer did not dispute within 3 days.",
            });
          }
        }

        // Notify seller
        await supabase.from("notifications").insert({
          user_id: quote.expert_id,
          type: "order_completed",
          title: "Payment auto-released! 💰",
          message: `Your order "${job.title}" was auto-completed after 3 days. €${sellerEarning.toFixed(2)} added to your wallet.`,
          data: { job_id: job.id },
        });

        // Notify buyer
        await supabase.from("notifications").insert({
          user_id: job.buyer_id,
          type: "order_completed",
          title: "Order auto-completed",
          message: `Your order "${job.title}" was automatically completed and payment released to the seller, as you did not confirm or dispute within 3 days.`,
          data: { job_id: job.id },
        });

        released++;
      } catch (jobErr) {
        console.error(`Failed to auto-release job ${job.id}:`, jobErr);
      }
    }

    return new Response(JSON.stringify({ released }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auto-release-funds error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
