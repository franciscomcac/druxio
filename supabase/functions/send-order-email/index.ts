import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM = "Druxio <noreply@druxio.lovable.app>";
const BASE = "https://druxio.lovable.app";

// ─── Template helpers ────────────────────────────────────────────
function emailTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;text-align:center;">
          <span style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Drux&#x26A1;o</span>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">${content}</td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you have an account on Druxio.<br/>
          <a href="${BASE}" style="color:#7c3aed;text-decoration:none;">Visit Druxio</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function cta(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${text}</a>`;
}
function h2(t: string) { return `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">${t}</h2>`; }
function p(t: string) { return `<p style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.6;">${t}</p>`; }
function row(l: string, v: string) { return `<tr><td style="padding:8px 12px;font-size:14px;color:#6b7280;font-weight:500;">${l}</td><td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">${v}</td></tr>`; }
function table(rows: string) { return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">${rows}</table>`; }

function formatMins(m: number) {
  if (m >= 1440) return `${Math.round(m / 1440)} day(s)`;
  if (m >= 60) return `${Math.round(m / 60)} hour(s)`;
  return `${m} min`;
}

async function sendResend(to: string, subject: string, html: string, apiKey: string) {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error("Resend error:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Resend not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verify caller is authenticated
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { event } = body;
  if (!event) {
    return new Response(JSON.stringify({ error: "Missing event" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Helper to get user email
  const getEmail = async (userId: string): Promise<string | null> => {
    const { data } = await adminClient.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  };

  // Helper to get profile
  const getProfile = async (userId: string) => {
    const { data } = await adminClient.from("profiles").select("display_name").eq("id", userId).single();
    return data;
  };

  try {
    // ─── Events that require a jobId ───────────────────────────────
    if (["order_delivered", "payment_released", "order_cancelled", "dispute_raised", "new_quote", "quote_accepted", "order_completed", "refund_issued"].includes(event)) {
      const { jobId } = body;
      if (!jobId) return new Response(JSON.stringify({ error: "Missing jobId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: job } = await adminClient.from("jobs").select("*").eq("id", jobId).single();
      if (!job) return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: quote } = await adminClient.from("quotes").select("*").eq("job_id", jobId).eq("status", "accepted").maybeSingle();
      const buyerProfile = await getProfile(job.buyer_id);
      const sellerProfile = quote ? await getProfile(quote.expert_id) : null;

      if (event === "order_delivered") {
        const buyerEmail = await getEmail(job.buyer_id);
        if (buyerEmail && quote) {
          const sellerName = sellerProfile?.display_name || "The seller";
          const html = emailTemplate(`
            ${h2("Your order has been delivered! 📦")}
            ${p(`<strong>${sellerName}</strong> has marked your order as delivered.`)}
            ${table(`
              ${row("Order", job.title)}
              ${row("Amount paid", `€${Number(quote.price).toFixed(2)}`)}
              ${row("Auto-release in", "3 days (if no action taken)")}
            `)}
            ${p("Please review the delivered work and confirm or raise a dispute.")}
            ${cta("Review Delivery", `${BASE}/order/${jobId}`)}
          `);
          await sendResend(buyerEmail, `Your order has been delivered — "${job.title}"`, html, resendKey);
        }

      } else if (event === "payment_released") {
        if (!quote) return okResponse();
        const sellerEmail = await getEmail(quote.expert_id);
        const earning = Math.round(Number(quote.price) * 0.95 * 100) / 100;
        if (sellerEmail) {
          const html = emailTemplate(`
            ${h2("Payment released! 💰")}
            ${p("The buyer has confirmed delivery and your payment has been released.")}
            ${table(`
              ${row("Job", job.title)}
              ${row("Amount credited", `€${earning.toFixed(2)}`)}
            `)}
            ${p("The funds are now in your wallet and available for withdrawal.")}
            ${cta("View Wallet", `${BASE}/wallet`)}
          `);
          await sendResend(sellerEmail, `Payment released! €${earning.toFixed(2)} added to your wallet 💰`, html, resendKey);
        }

      } else if (event === "order_completed") {
        // Email buyer: order completed confirmation
        const buyerEmail = await getEmail(job.buyer_id);
        if (buyerEmail && quote) {
          const html = emailTemplate(`
            ${h2("Order completed! 🎉")}
            ${p("Thank you for confirming delivery. This order is now complete.")}
            ${table(`
              ${row("Order", job.title)}
              ${row("Amount", `€${Number(quote.price).toFixed(2)}`)}
            `)}
            ${p("If you enjoyed the service, consider leaving a review to help other users.")}
            ${cta("View Order", `${BASE}/order/${jobId}`)}
          `);
          await sendResend(buyerEmail, `Order completed — "${job.title}" 🎉`, html, resendKey);
        }

      } else if (event === "order_cancelled") {
        const buyerEmail = await getEmail(job.buyer_id);
        const reason = body.reason || "No reason provided";
        const sellerName = sellerProfile?.display_name || "The seller";
        if (buyerEmail) {
          const html = emailTemplate(`
            ${h2("Order cancelled by seller")}
            ${p(`We're sorry — <strong>${sellerName}</strong> has cancelled this order.`)}
            ${table(`
              ${row("Order", job.title)}
              ${row("Reason", reason)}
            `)}
            ${p("A refund will be processed. If you have questions, contact our support team.")}
            ${cta("Contact Support", `${BASE}/dashboard`)}
          `);
          await sendResend(buyerEmail, `Order cancelled — "${job.title}"`, html, resendKey);
        }

      } else if (event === "refund_issued") {
        // Email buyer: refund issued
        const buyerEmail = await getEmail(job.buyer_id);
        const refundAmount = body.refundAmount || (quote ? Number(quote.price) * 1.05 : 0);
        if (buyerEmail) {
          const html = emailTemplate(`
            ${h2("Refund issued! 🛡️")}
            ${p("A refund has been credited to your store balance.")}
            ${table(`
              ${row("Order", job.title)}
              ${row("Refund amount", `€${Number(refundAmount).toFixed(2)}`)}
            `)}
            ${p("The funds are available immediately in your wallet.")}
            ${cta("View Wallet", `${BASE}/wallet`)}
          `);
          await sendResend(buyerEmail, `Refund issued — €${Number(refundAmount).toFixed(2)} credited to your balance`, html, resendKey);
        }

      } else if (event === "dispute_raised") {
        const reason = body.reason || "No reason provided";
        const buyerId = job.buyer_id;
        const sellerId = quote?.expert_id || "unknown";
        // Email admins
        const { data: adminRoles } = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
        if (adminRoles) {
          await Promise.all(adminRoles.map(async (a) => {
            const adminEmail = await getEmail(a.user_id);
            if (!adminEmail) return;
            const html = emailTemplate(`
              ${h2("⚠️ Dispute Raised")}
              ${p("A buyer has raised a dispute on an order. Please review and take action.")}
              ${table(`
                ${row("Job", job.title)}
                ${row("Job ID", jobId)}
                ${row("Buyer ID", buyerId)}
                ${row("Seller ID", sellerId)}
                ${row("Reason", reason)}
              `)}
              ${cta("View Admin Panel", `${BASE}/admin`)}
            `);
            await sendResend(adminEmail, `⚠️ Dispute raised — "${job.title}"`, html, resendKey);
          }));
        }
        // Also email the seller about the dispute
        if (quote) {
          const sellerEmail = await getEmail(quote.expert_id);
          if (sellerEmail) {
            const buyerName = buyerProfile?.display_name || "The buyer";
            const html = emailTemplate(`
              ${h2("⚠️ A dispute has been raised")}
              ${p(`<strong>${buyerName}</strong> has raised a dispute on your order.`)}
              ${table(`
                ${row("Order", job.title)}
                ${row("Reason", reason)}
              `)}
              ${p("Please check the order page and work towards a resolution.")}
              ${cta("View Order", `${BASE}/order/${jobId}`)}
            `);
            await sendResend(sellerEmail, `Dispute raised on your order — "${job.title}"`, html, resendKey);
          }
        }

      } else if (event === "new_quote") {
        const quoteData = body.quote;
        if (!quoteData) return okResponse();
        const buyerEmail = await getEmail(job.buyer_id);
        const expertProfile = await getProfile(quoteData.expert_id);
        if (buyerEmail) {
          const expertName = expertProfile?.display_name || "An expert";
          const delivery = formatMins(quoteData.estimated_minutes || 20);
          const html = emailTemplate(`
            ${h2("You have a new quote! 📩")}
            ${p(`<strong>${expertName}</strong> has submitted a quote on your request.`)}
            ${table(`
              ${row("Request", job.title)}
              ${row("Quote price", `€${Number(quoteData.price).toFixed(2)}`)}
              ${row("Delivery time", delivery)}
            `)}
            ${p("Review the quote and chat with the expert before accepting.")}
            ${cta("View Quotes", `${BASE}/active-request/${jobId}`)}
          `);
          await sendResend(buyerEmail, `New quote received for "${job.title}"`, html, resendKey);
        }

      } else if (event === "quote_accepted") {
        if (!quote) return okResponse();
        const sellerEmail = await getEmail(quote.expert_id);
        const buyerName = buyerProfile?.display_name || "The buyer";
        if (sellerEmail) {
          const html = emailTemplate(`
            ${h2("Your quote was accepted! 🎉")}
            ${p(`<strong>${buyerName}</strong> has accepted your quote. Time to get to work!`)}
            ${table(`
              ${row("Job", job.title)}
              ${row("Your price", `€${Number(quote.price).toFixed(2)}`)}
              ${row("Platform fee", "5%")}
              ${row("Your earning", `€${(Number(quote.price) * 0.95).toFixed(2)}`)}
            `)}
            ${p("Head to the order page to start working and communicate with the buyer.")}
            ${cta("Go to Order", `${BASE}/order/${jobId}`)}
          `);
          await sendResend(sellerEmail, `Your quote was accepted! 🎉`, html, resendKey);
        }
      }

    // ─── New message received ────────────────────────────────────────
    } else if (event === "new_message") {
      const { recipientId, senderName, messagePreview, sessionId } = body;
      if (!recipientId) return okResponse();
      const recipientEmail = await getEmail(recipientId);
      if (recipientEmail) {
        const preview = (messagePreview || "").substring(0, 100);
        const html = emailTemplate(`
          ${h2("New message received 💬")}
          ${p(`<strong>${senderName || "Someone"}</strong> sent you a message:`)}
          <div style="margin:16px 0;padding:16px;background:#f3f4f6;border-radius:8px;border-left:4px solid #7c3aed;">
            <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${preview}${preview.length >= 100 ? "..." : ""}"</p>
          </div>
          ${p("Reply now to keep the conversation going.")}
          ${cta("Open Inbox", `${BASE}/inbox?session=${sessionId || ""}`)}
        `);
        await sendResend(recipientEmail, `New message from ${senderName || "a user"} on Druxio`, html, resendKey);
      }

    // ─── Withdrawal submitted ────────────────────────────────────────
    } else if (event === "withdrawal_submitted") {
      const { userId, amount, paypalEmail, netAmount } = body;
      if (!userId) return okResponse();
      const userEmail = await getEmail(userId);
      if (userEmail) {
        const html = emailTemplate(`
          ${h2("Withdrawal request submitted 📤")}
          ${p("Your withdrawal request has been submitted and is being processed.")}
          ${table(`
            ${row("Amount", `€${Number(amount).toFixed(2)}`)}
            ${row("Net (after fees)", `€${Number(netAmount).toFixed(2)}`)}
            ${row("PayPal", paypalEmail)}
            ${row("Status", "Processing")}
          `)}
          ${p("You'll receive another email once the payout is complete. This usually takes 1-3 business days.")}
          ${cta("View Wallet", `${BASE}/wallet`)}
        `);
        await sendResend(userEmail, `Withdrawal request submitted — €${Number(amount).toFixed(2)}`, html, resendKey);
      }

    // ─── Withdrawal processed ────────────────────────────────────────
    } else if (event === "withdrawal_processed") {
      const { userId, amount, status, adminNotes } = body;
      if (!userId) return okResponse();
      const userEmail = await getEmail(userId);
      if (userEmail) {
        const isApproved = status === "completed";
        const html = emailTemplate(`
          ${h2(isApproved ? "Withdrawal completed! ✅" : "Withdrawal update")}
          ${p(isApproved
            ? "Great news! Your withdrawal has been processed and funds sent to your PayPal."
            : `Your withdrawal request has been updated. Status: <strong>${status}</strong>`
          )}
          ${table(`
            ${row("Amount", `€${Number(amount).toFixed(2)}`)}
            ${row("Status", status)}
            ${adminNotes ? row("Notes", adminNotes) : ""}
          `)}
          ${cta("View Wallet", `${BASE}/wallet`)}
        `);
        await sendResend(
          userEmail,
          isApproved ? `Withdrawal completed — €${Number(amount).toFixed(2)} sent ✅` : `Withdrawal update — ${status}`,
          html,
          resendKey
        );
      }

    // ─── Review received ─────────────────────────────────────────────
    } else if (event === "review_received") {
      const { revieweeId, reviewerName, rating, comment, jobTitle } = body;
      if (!revieweeId) return okResponse();
      const revieweeEmail = await getEmail(revieweeId);
      if (revieweeEmail) {
        const stars = "⭐".repeat(Math.min(rating || 5, 5));
        const html = emailTemplate(`
          ${h2("You received a review! ⭐")}
          ${p(`<strong>${reviewerName || "A user"}</strong> left you a ${rating}-star review.`)}
          ${table(`
            ${row("Rating", stars)}
            ${jobTitle ? row("Order", jobTitle) : ""}
            ${comment ? row("Comment", `"${comment}"`) : ""}
          `)}
          ${p("Keep up the great work! Reviews help build your reputation on Druxio.")}
          ${cta("View Profile", `${BASE}/dashboard`)}
        `);
        await sendResend(revieweeEmail, `New ${rating}-star review on Druxio ⭐`, html, resendKey);
      }

    // ─── New request posted (notify subscribed experts) ──────────────
    } else if (event === "new_request_posted") {
      const { jobId, category, subcategory, title, buyerId } = body;
      if (!jobId) return okResponse();
      // Find experts subscribed to this category
      const categoryPrefix = `${category}:`;
      const { data: experts } = await adminClient
        .from("expert_categories")
        .select("user_id")
        .like("category", `${categoryPrefix}%`);
      if (experts && experts.length > 0) {
        const uniqueExperts = [...new Set(experts.map(e => e.user_id))].filter(id => id !== buyerId);
        // Limit to first 50 experts to avoid timeout
        const batch = uniqueExperts.slice(0, 50);
        await Promise.all(batch.map(async (expertId) => {
          const expertEmail = await getEmail(expertId);
          if (!expertEmail) return;
          const html = emailTemplate(`
            ${h2("New request in your category! 🔔")}
            ${p(`A new request has been posted that matches your expertise.`)}
            ${table(`
              ${row("Title", title || "Untitled")}
              ${row("Category", category)}
              ${subcategory ? row("Subcategory", subcategory) : ""}
            `)}
            ${p("Be the first to submit a quote and win the job!")}
            ${cta("View Request", `${BASE}/active-request/${jobId}`)}
          `);
          await sendResend(expertEmail, `New ${category} request: "${title || "Untitled"}"`, html, resendKey);
        }));
      }
    }

    return okResponse();
  } catch (err) {
    console.error("send-order-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function okResponse() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
