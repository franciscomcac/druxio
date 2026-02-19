
# Email Notifications for All Main Events

## Overview

The `send-email` edge function (powered by Resend) is already set up and working. The plan is to plug email calls into the key moments across the app — sign-up, order lifecycle, withdrawals, and disputes. Each email will be triggered from the relevant page/component/edge function where the event already fires.

---

## Email Events — Full List

### 1. Welcome Email (on sign-up)
- **Trigger**: `src/pages/Auth.tsx` — after `supabase.auth.signUp()` succeeds
- **Recipient**: New user's email
- **Content**: Welcome to Duxio, brief intro, link to dashboard

### 2. New Quote Received (Buyer)
- **Trigger**: `src/pages/MentorProfile.tsx` or wherever quote submit happens — after expert submits a quote on a job
- **Recipient**: Buyer (job owner)
- **Content**: "An expert submitted a quote on your request", quote price, link to order page

### 3. Quote Accepted (Seller/Expert)
- **Trigger**: `src/pages/Order.tsx` or `ActiveRequest.tsx` — when buyer accepts a quote
- **Recipient**: Expert/Seller
- **Content**: "Your quote was accepted!", job title, price, link to order page

### 4. Order Delivered (Buyer)
- **Trigger**: `src/pages/Order.tsx` → `handleSellerDeliver()` — already fires a notification, add email here
- **Recipient**: Buyer
- **Content**: "Your order has been delivered", 3-day auto-release warning, confirm/dispute link

### 5. Payment Released to Seller
- **Trigger**: `src/pages/Order.tsx` → `handleConfirmDelivery()` — already sends notification, add email
- **Recipient**: Seller/Expert
- **Content**: "Payment released! €X has been added to your wallet", total earnings

### 6. Withdrawal Submitted (User)
- **Trigger**: `supabase/functions/withdraw/index.ts` — at the end of the function, after withdrawal record is created
- **Recipient**: User who requested withdrawal
- **Content**: Amount, method (PayPal/Crypto), processing time (24-48h), withdrawal ID

### 7. Dispute Raised — Admin Alert
- **Trigger**: `src/pages/Order.tsx` → `handleRaiseDispute()` — after job status set to `disputed`
- **Recipient**: All admin users (fetched via `user_roles`)
- **Content**: Job title, reason, links to both buyer and seller

### 8. Order Cancelled by Seller (Buyer)
- **Trigger**: `src/pages/Order.tsx` → `handleCancelDelivery()` — already sends notification
- **Recipient**: Buyer
- **Content**: "Your order was cancelled by the seller", refund notice, cancel reason

---

## Technical Implementation Plan

### Step 1 — Shared Email Helper (`src/lib/send-email.ts`)
Create a small utility that wraps `supabase.functions.invoke("send-email", ...)` with typed email templates. This keeps all template HTML in one place and avoids repetition.

```ts
// src/lib/send-email.ts
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) { ... }
```

### Step 2 — HTML Email Templates
All templates will be consistent branded HTML strings with:
- Duxio logo/name in header
- Clean white body, primary-colored CTAs
- Footer with "You're receiving this because you have an account on Duxio"

### Step 3 — Inject email calls at each trigger point

| Event | File to edit | Where to add |
|-------|-------------|--------------|
| Welcome | `src/pages/Auth.tsx` | After `signUp()` success |
| New quote received | `src/pages/ActiveRequest.tsx` | After quote insert |
| Quote accepted | `src/pages/ActiveRequest.tsx` or `Order.tsx` | After quote status → accepted |
| Order delivered | `src/pages/Order.tsx` | In `handleSellerDeliver()` |
| Payment released | `src/pages/Order.tsx` | In `handleConfirmDelivery()` |
| Order cancelled | `src/pages/Order.tsx` | In `handleCancelDelivery()` |
| Dispute raised | `src/pages/Order.tsx` | In `handleRaiseDispute()` |
| Withdrawal submitted | `supabase/functions/withdraw/index.ts` | After withdrawal record created |

### Step 4 — Withdrawal email (server-side only)
For the withdrawal email, the call to Resend will happen directly inside the `withdraw` edge function (no client involvement), fetching the user's email via the admin client from `auth.users`.

---

## Files to Create/Edit

- **Create**: `src/lib/send-email.ts` — shared helper + all HTML templates
- **Edit**: `src/pages/Auth.tsx` — welcome email on signup
- **Edit**: `src/pages/Order.tsx` — delivered, payment released, cancelled, dispute emails
- **Edit**: `src/pages/ActiveRequest.tsx` — new quote + quote accepted emails
- **Edit**: `supabase/functions/withdraw/index.ts` — withdrawal confirmation email (server-side via Resend directly)

---

## Notes

- All emails fire **non-blocking** (fire-and-forget with `.catch(console.error)`) so they never break the user flow if Resend is temporarily down.
- The `from` address is already configured as `Duxio <noreply@duxio.lovable.app>`.
- User emails are fetched via `supabase.auth.getUser()` on the client side, or via the admin client in edge functions.
- No new database tables or RLS policies are required.
