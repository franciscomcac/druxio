import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEE_RATE = 0.05;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" }) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: eligibleJobs, error } = await supabase
      .from("jobs")
      .select("id, buyer_id, title, accepted_quote_id, stripe_payment_intent_id")
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
        const { data: quote } = await supabase
          .from("quotes")
          .select("*")
          .eq("job_id", job.id)
          .eq("status", "accepted")
          .maybeSingle();

        if (!quote) continue;

        const servicePrice = Number(quote.price);
        const sellerEarning = Math.round(servicePrice * (1 - PLATFORM_FEE_RATE) * 100) / 100;

        // Try Stripe transfer first
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("stripe_connect_id, wallet_balance")
          .eq("id", quote.expert_id)
          .single();

        if (stripe && sellerProfile?.stripe_connect_id) {
          // Transfer via Stripe
          const transferAmountCents = Math.round(sellerEarning * 100);
          const transfer = await stripe.transfers.create({
            amount: transferAmountCents,
            currency: "eur",
            destination: sellerProfile.stripe_connect_id,
            transfer_group: `job_${job.id}`,
            metadata: { job_id: job.id, seller_id: quote.expert_id, auto_release: "true" },
          });

          await supabase.from("transactions").insert({
            user_id: quote.expert_id,
            amount: sellerEarning,
            type: "session_earning",
            status: "completed",
            description: `Auto-released: job ${job.id} (transferred via Stripe)`,
            stripe_payment_id: transfer.id,
          });
        } else {
          // Fallback: credit wallet
          const currentBalance = Number(sellerProfile?.wallet_balance || 0);
          await supabase.from("profiles").update({
            wallet_balance: currentBalance + sellerEarning,
          }).eq("id", quote.expert_id);

          await supabase.from("transactions").insert({
            user_id: quote.expert_id,
            amount: sellerEarning,
            type: "session_earning",
            status: "completed",
            description: `Auto-released: job ${job.id} (wallet credit — set up Stripe for direct payouts)`,
          });
        }

        // Mark job completed
        await supabase.from("jobs").update({ status: "completed", escrow_status: "completed" }).eq("id", job.id);

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
          message: `Your order "${job.title}" was auto-completed after 3 days. €${sellerEarning.toFixed(2)} transferred.`,
          data: { job_id: job.id },
        });

        // Notify buyer
        await supabase.from("notifications").insert({
          user_id: job.buyer_id,
          type: "order_completed",
          title: "Order auto-completed",
          message: `Your order "${job.title}" was automatically completed and payment released to the seller.`,
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
