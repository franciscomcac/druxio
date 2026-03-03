

## Dispute Flow Overhaul

### Current State
- **Buyer** can raise a dispute from the order page (sets job status to "disputed", notifies seller + admin email)
- **Admin** can resolve disputes with two actions: "Refund" (adds a `refund` transaction to buyer's store balance, cancels order) or "Release" (releases funds to seller, completes order)
- **No refund-to-source option** exists — all refunds go to store balance
- **No system message** is posted in the order chat when a dispute is resolved
- **Order page** shows a static "Dispute Raised — Under admin review" card but no resolution outcome

### Plan

#### 1. Update Admin Dispute Resolution (Admin.tsx)
- Change the refund action to present **two refund options**:
  - **Refund to Store Balance** — instant, same as current behavior (insert `refund` transaction)
  - **Refund to Original Payment Method** — calls a new edge function to process a Stripe refund; UI warns "takes up to 7 business days"
- Release action stays the same (release funds to seller via Stripe Connect)
- After resolution, **send an admin system message** into the order chat via the existing `admin-order-message` edge function, summarizing the outcome
- Update notification messages to reflect the refund method chosen

#### 2. Create `stripe-refund` Edge Function
- New function `supabase/functions/stripe-refund/index.ts`
- Accepts `jobId` and verifies the caller is an admin
- Looks up the job's `stripe_payment_intent_id`, calls `Stripe.refunds.create()` against it
- Inserts a `refund` transaction with status `pending` and description noting "Refund to original payment method — up to 7 business days"
- Returns success/error
- Add to `config.toml` with `verify_jwt = false`

#### 3. Update Order Page Post-Dispute State (Order.tsx)
- When the job status changes to `cancelled` (refund) or `completed` (release) after being disputed, show a **resolution card** in the chat area:
  - Green card for "Payment Released to Seller"
  - Blue card for "Refund Issued" with note about method (store balance = instant, source = up to 7 days)
- The dispute system message and admin notice already render; this adds the final resolution state
- Disable the chat input when the order is in a terminal state (completed/cancelled)

#### 4. Update Dispute Chat Message on Raise (Order.tsx)
- When the buyer raises a dispute, also insert a system message in the chat (like the delivery message) so both parties see it inline

#### 5. Notification & Email Updates
- Update dispute resolution notifications to specify refund method
- The existing `send-order-email` edge function already handles `dispute_raised`; no changes needed there

### Technical Details

**Admin refund flow (Admin.tsx `handleDisputeResolve`):**
- Add `refundMethod` state: `"balance" | "source"`
- If `"balance"`: current flow (insert completed refund transaction)
- If `"source"`: invoke `stripe-refund` edge function, insert pending refund transaction
- Both: update job status to cancelled, notify both parties, send admin order message

**stripe-refund edge function:**
```
POST { jobId }
→ verify admin role
→ fetch job.stripe_payment_intent_id
→ Stripe.refunds.create({ payment_intent })
→ insert transaction (type: refund, status: pending)
→ return { success, refundId }
```

**No DB schema changes needed** — existing `transactions` table already supports refund type with pending/completed status, and `jobs` table has `stripe_payment_intent_id`.

