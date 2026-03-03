

# Stripe Connect Integration Plan for Druxio

## Current State

The platform currently uses **PayPal** for both buyer payments (checkout) and seller withdrawals. The flow:
- **Buyer pays**: PayPal Checkout popup → `paypal-create-order` → `paypal-capture-order` edge functions
- **Seller receives**: Funds credited to internal wallet on delivery confirmation → withdraw via PayPal Payout or Crypto
- **Auto-release**: `auto-release-funds` credits seller wallet after 3 days if buyer doesn't act
- The `profiles` table already has `stripe_connect_id` and `stripe_customer_id` columns (currently unused)

## Architecture: Stripe Connect (Destination Charges)

Using **Stripe Connect with destination charges**, the platform collects the full payment and transfers the seller's portion minus the 5% platform fee. This is the simplest Connect model for marketplaces.

```text
Buyer → Stripe Checkout → Platform account (holds funds)
                              │
                              ├─ On delivery confirm: Transfer to seller's Connect account
                              │   (minus 5% platform fee)
                              └─ On dispute: Admin handles refund
```

## Changes Required

### 1. Enable Stripe via Lovable tool
Use the `stripe--enable_stripe` tool to set up the Stripe secret key.

### 2. New Edge Functions

**`stripe-create-checkout`** — Replaces `paypal-create-order`
- Receives `quoteId`, `jobId`
- Creates a Stripe Checkout Session with the service price + 5% platform fee
- Uses `payment_intent_data.transfer_group` to tag payments for later transfer
- Returns the Checkout Session URL

**`stripe-checkout-webhook`** — Handles `checkout.session.completed`
- Marks job as accepted, quote as accepted, creates session
- Stores `stripe_payment_intent_id` on the transaction or job

**`stripe-onboard-seller`** — Creates Stripe Connect Account Link
- Creates a Connect Express account if seller doesn't have one
- Returns the onboarding URL
- On return, stores `stripe_connect_id` on the seller's profile

**`stripe-account-status`** — Checks if seller's Connect account is active
- Returns `charges_enabled`, `payouts_enabled`

**`stripe-transfer-funds`** — Replaces wallet crediting on delivery confirm
- Creates a Stripe Transfer from platform to seller's Connect account
- Deducts 5% platform fee as `application_fee`

**`stripe-payout`** — Replaces `withdraw` function
- Triggers a payout from the seller's Connect account to their bank
- Or sellers can rely on Stripe's automatic daily/weekly payouts

### 3. Database Changes

- Add `stripe_payment_intent_id` column to `jobs` table (to track the payment for transfers)
- Add migration for any new columns needed

### 4. Frontend Changes

**`ActiveRequest.tsx`** — Replace PayPal dialog
- Remove PayPal popup flow
- Replace with Stripe Checkout redirect (server-side session → redirect to Stripe hosted page → return URL)
- Update fee breakdown display (remove PayPal fees, show only 5% platform fee)

**`Order.tsx`** — Update delivery confirmation
- `handleConfirmDelivery`: Instead of crediting wallet directly, call `stripe-transfer-funds` to transfer to seller's Connect account
- `auto-release-funds`: Same — call Stripe Transfer instead of wallet credit

**`WithdrawalDialog.tsx`** — Simplify or replace
- Remove PayPal/Crypto withdrawal options
- Replace with "Stripe manages your payouts" info card, or a manual payout trigger
- Sellers configure their bank/payout details via Stripe Connect dashboard

**`Wallet.tsx`** — Update info cards
- Remove PayPal fee references
- Update to reflect Stripe-based flow

**Settings or Dashboard** — Add Stripe Connect onboarding
- Button for sellers to "Connect with Stripe" (redirects to Stripe onboarding)
- Show connection status (active/pending)

**Legal pages** — Remove PayPal cookie references, update fee descriptions

### 5. Remove PayPal
- Delete `paypal-create-order` and `paypal-capture-order` edge functions
- Remove `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` secrets (optional, can leave)
- Clean up all PayPal references in UI text

### 6. Update `auto-release-funds`
- Instead of crediting seller wallet, call Stripe Transfer to seller's Connect account

## Implementation Order

1. Enable Stripe via tool
2. Create DB migration (add `stripe_payment_intent_id` to jobs)
3. Create edge functions: `stripe-onboard-seller`, `stripe-account-status`, `stripe-create-checkout`, `stripe-checkout-webhook`, `stripe-transfer-funds`
4. Update frontend: seller onboarding flow, checkout flow, delivery confirmation, wallet page, withdrawal dialog
5. Delete PayPal edge functions
6. Update legal/content pages

## Fee Structure (unchanged conceptually)
- Buyers: 5% platform fee (no more PayPal processing fee visible — Stripe fees are absorbed or passed through transparently)
- Sellers: 5% deducted at transfer time
- No withdrawal fees — Stripe handles payouts to seller's bank directly

