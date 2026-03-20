import { supabase } from "@/integrations/supabase/client";

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  return supabase.functions.invoke("send-email", { body: params }).catch(console.error);
}

/** Fire-and-forget helper to invoke the send-order-email edge function */
export function sendOrderEmail(event: string, extra?: Record<string, unknown>) {
  supabase.functions.invoke("send-order-email", { body: { event, ...extra } }).catch(console.error);
}

// ─── Shared template wrapper ───────────────────────────────────────────────
function emailTemplate(content: string) {
  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Druxio</title>
  <!--[if mso]><style>table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0d0f17;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0f17;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Preheader (hidden) -->
        <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Druxio — Expert help on demand</div>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#161827;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
          <!-- Logo header -->
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:'Segoe UI',Arial,sans-serif;">Drux</td>
                  <td style="font-size:28px;font-weight:800;color:#00c8e0;letter-spacing:-0.5px;font-family:'Segoe UI',Arial,sans-serif;">⚡</td>
                  <td style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:'Segoe UI',Arial,sans-serif;">o</td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">Expert Help On Demand</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.06);padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#4b5563;">
                You're receiving this because you have an account on Druxio.
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="https://duxio.store" style="color:#00c8e0;text-decoration:none;">duxio.store</a>
                <span style="color:#374151;margin:0 8px;">·</span>
                <a href="mailto:support@druxio.net" style="color:#00c8e0;text-decoration:none;">Support</a>
              </p>
              <p style="margin:16px 0 0;font-size:11px;color:#374151;">© ${new Date().getFullYear()} Druxio. All rights reserved.</p>
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr>
      <td style="background-color:#1d4ed8;border-radius:8px;padding:14px 32px;">
        <a href="${url}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;font-family:'Segoe UI',Arial,sans-serif;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function heading(text: string) {
  return `<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f3f4f6;line-height:1.3;">${text}</h2>`;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 14px;font-size:15px;color:#d1d5db;line-height:1.65;">${text}</p>`;
}

function infoRow(label: string, value: string) {
  return `
  <tr>
    <td style="padding:10px 16px;font-size:13px;color:#9ca3af;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.04);">${label}</td>
    <td style="padding:10px 16px;font-size:13px;color:#e5e7eb;font-weight:600;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">${value}</td>
  </tr>`;
}

function infoTable(rows: string) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
    ${rows}
  </table>`;
}

// ─── Welcome email ─────────────────────────────────────────────────────────
export function buildWelcomeEmail(userEmail: string) {
  return {
    to: userEmail,
    subject: "Welcome to Druxio! 🎉",
    html: emailTemplate(`
      ${heading("Welcome aboard! 🎉")}
      ${paragraph("You've just joined Druxio — the fastest way to get expert help on demand.")}
      ${paragraph("Post a request, receive quotes from vetted experts in minutes, and get your work done — all within a safe, escrow-protected environment.")}
      ${ctaButton("Go to Dashboard", "https://duxio.store/dashboard")}
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
      ${ctaButton("View Quotes", `https://duxio.store/active-request/${opts.jobId}`)}
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
      ${ctaButton("Go to Order", `https://duxio.store/order/${opts.jobId}`)}
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
      ${ctaButton("Review Delivery", `https://duxio.store/order/${opts.jobId}`)}
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
      ${ctaButton("View Wallet", "https://duxio.store/wallet")}
    `),
  };
}

// ─── Dispute raised (admin alert) ─────────────────────────────────────────
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
      ${ctaButton("View in Admin", "https://duxio.store/admin")}
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
      ${ctaButton("Contact Support", "https://duxio.store/dashboard")}
    `),
  };
}
