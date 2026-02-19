import { supabase } from "@/integrations/supabase/client";

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  return supabase.functions.invoke("send-email", { body: params }).catch(console.error);
}

// ─── Shared template wrapper ───────────────────────────────────────────────
function emailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Duxio</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Dux⚡o</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you have an account on Duxio.<br/>
                <a href="https://duxio.lovable.app" style="color:#7c3aed;text-decoration:none;">Visit Duxio</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${text}</a>`;
}

function heading(text: string) {
  return `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">${text}</h2>`;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.6;">${text}</p>`;
}

function infoRow(label: string, value: string) {
  return `
  <tr>
    <td style="padding:8px 12px;font-size:14px;color:#6b7280;font-weight:500;">${label}</td>
    <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600;">${value}</td>
  </tr>`;
}

function infoTable(rows: string) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
    ${rows}
  </table>`;
}

// ─── Welcome email ─────────────────────────────────────────────────────────
export function buildWelcomeEmail(userEmail: string) {
  return {
    to: userEmail,
    subject: "Welcome to Duxio! 🎉",
    html: emailTemplate(`
      ${heading("Welcome aboard! 🎉")}
      ${paragraph("You've just joined Duxio — the fastest way to get expert help on demand.")}
      ${paragraph("Post a request, receive quotes from vetted experts in minutes, and get your work done — all within a safe, escrow-protected environment.")}
      ${ctaButton("Go to Dashboard", "https://duxio.lovable.app/dashboard")}
    `),
  };
}

// ─── New quote received (buyer) ────────────────────────────────────────────
export function buildNewQuoteEmail(opts: {
  to: string;
  jobTitle: string;
  expertName: string;
  price: number;
  deliveryMinutes: number;
  jobId: string;
}) {
  const delivery =
    opts.deliveryMinutes >= 1440
      ? `${Math.round(opts.deliveryMinutes / 1440)} day(s)`
      : opts.deliveryMinutes >= 60
      ? `${Math.round(opts.deliveryMinutes / 60)} hour(s)`
      : `${opts.deliveryMinutes} min`;

  return {
    to: opts.to,
    subject: `New quote received for "${opts.jobTitle}"`,
    html: emailTemplate(`
      ${heading("You have a new quote! 📩")}
      ${paragraph(`<strong>${opts.expertName}</strong> has submitted a quote on your request.`)}
      ${infoTable(`
        ${infoRow("Request", opts.jobTitle)}
        ${infoRow("Quote price", `€${opts.price.toFixed(2)}`)}
        ${infoRow("Delivery time", delivery)}
      `)}
      ${paragraph("Review the quote and chat with the expert before accepting.")}
      ${ctaButton("View Quotes", `https://duxio.lovable.app/active-request/${opts.jobId}`)}
    `),
  };
}

// ─── Quote accepted (expert/seller) ───────────────────────────────────────
export function buildQuoteAcceptedEmail(opts: {
  to: string;
  jobTitle: string;
  buyerName: string;
  price: number;
  jobId: string;
}) {
  return {
    to: opts.to,
    subject: `Your quote was accepted! 🎉`,
    html: emailTemplate(`
      ${heading("Your quote was accepted! 🎉")}
      ${paragraph(`<strong>${opts.buyerName}</strong> has accepted your quote. Time to get to work!`)}
      ${infoTable(`
        ${infoRow("Job", opts.jobTitle)}
        ${infoRow("Your price", `€${opts.price.toFixed(2)}`)}
        ${infoRow("Platform fee", "5% deducted at completion")}
        ${infoRow("Your earning", `€${(opts.price * 0.95).toFixed(2)}`)}
      `)}
      ${paragraph("Head to the order page to start working and communicate with the buyer.")}
      ${ctaButton("Go to Order", `https://duxio.lovable.app/order/${opts.jobId}`)}
    `),
  };
}

// ─── Order delivered (buyer) ───────────────────────────────────────────────
export function buildOrderDeliveredEmail(opts: {
  to: string;
  jobTitle: string;
  sellerName: string;
  price: number;
  jobId: string;
}) {
  return {
    to: opts.to,
    subject: `Your order has been delivered — "${opts.jobTitle}"`,
    html: emailTemplate(`
      ${heading("Your order has been delivered! 📦")}
      ${paragraph(`<strong>${opts.sellerName}</strong> has marked your order as delivered.`)}
      ${infoTable(`
        ${infoRow("Order", opts.jobTitle)}
        ${infoRow("Amount paid", `€${opts.price.toFixed(2)}`)}
        ${infoRow("Auto-release in", "3 days (if no action taken)")}
      `)}
      ${paragraph("Please review the delivered work and either confirm delivery to release payment, or raise a dispute if there is an issue.")}
      ${ctaButton("Review Delivery", `https://duxio.lovable.app/order/${opts.jobId}`)}
    `),
  };
}

// ─── Payment released (seller) ────────────────────────────────────────────
export function buildPaymentReleasedEmail(opts: {
  to: string;
  jobTitle: string;
  earning: number;
  jobId: string;
}) {
  return {
    to: opts.to,
    subject: `Payment released! €${opts.earning.toFixed(2)} added to your wallet 💰`,
    html: emailTemplate(`
      ${heading("Payment released! 💰")}
      ${paragraph("Great news! The buyer has confirmed delivery and your payment has been released.")}
      ${infoTable(`
        ${infoRow("Job", opts.jobTitle)}
        ${infoRow("Amount credited", `€${opts.earning.toFixed(2)}`)}
      `)}
      ${paragraph("The funds are now in your wallet and available for withdrawal.")}
      ${ctaButton("View Wallet", "https://duxio.lovable.app/wallet")}
    `),
  };
}

// ─── Dispute raised (admin alert - handled server-side, but exported for reference) ───
export function buildDisputeAdminEmail(opts: {
  to: string;
  jobTitle: string;
  jobId: string;
  buyerId: string;
  sellerId: string;
  reason: string;
}) {
  return {
    to: opts.to,
    subject: `⚠️ Dispute raised — "${opts.jobTitle}"`,
    html: emailTemplate(`
      ${heading("⚠️ Dispute Raised")}
      ${paragraph("A buyer has raised a dispute on an order. Please review and take action.")}
      ${infoTable(`
        ${infoRow("Job", opts.jobTitle)}
        ${infoRow("Job ID", opts.jobId)}
        ${infoRow("Buyer ID", opts.buyerId)}
        ${infoRow("Seller ID", opts.sellerId)}
        ${infoRow("Reason", opts.reason)}
      `)}
      ${ctaButton("View in Admin", "https://duxio.lovable.app/admin")}
    `),
  };
}

// ─── Order cancelled (buyer) ───────────────────────────────────────────────
export function buildOrderCancelledEmail(opts: {
  to: string;
  jobTitle: string;
  sellerName: string;
  reason: string;
  jobId: string;
}) {
  return {
    to: opts.to,
    subject: `Order cancelled — "${opts.jobTitle}"`,
    html: emailTemplate(`
      ${heading("Order cancelled by seller")}
      ${paragraph(`We're sorry — <strong>${opts.sellerName}</strong> has cancelled this order.`)}
      ${infoTable(`
        ${infoRow("Order", opts.jobTitle)}
        ${infoRow("Reason", opts.reason)}
      `)}
      ${paragraph("A refund will be processed to your original payment method. If you have any questions, please contact our support team.")}
      ${ctaButton("Contact Support", "https://duxio.lovable.app/dashboard")}
    `),
  };
}
