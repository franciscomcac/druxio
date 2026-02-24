

## Seller Orders Overhaul: Separate Quotes from Active Orders + Auto-Expiry + Withdraw Quotes

This plan restructures the seller-side experience to reduce clutter, separate concerns, and add quote lifecycle management.

---

### Current Problem

Right now, the seller's "My Orders" page (`ActiveRequest.tsx`) mixes **pending quotes** (pre-payment conversations) with **active orders** (paid, in-progress work) in a single sidebar. This creates clutter and makes it hard to focus on actual paid work. Sellers also cannot withdraw/close their own quotes, and stale quotes live forever.

---

### What Changes

**1. Separate the Seller Sidebar into Two Tabs: "Quotes" and "Orders"**

Inside the seller layout in `ActiveRequest.tsx`, split the left sidebar into two tabs:

- **Quotes tab** -- Shows all conversations where the seller has a pending quote (job status = `open`, quote status = `pending`). These are pre-sale negotiations.
- **Orders tab** -- Shows conversations where the quote was accepted and payment was made (job status = `accepted`/`completed`/`disputed`). These are active/completed orders.

This keeps the same page and same chat interface but separates the list cleanly.

**2. Allow Sellers to Withdraw/Close Their Own Quotes**

Add a "Withdraw Quote" button in the right panel (job details section) when viewing a pending quote. This will:
- Update the quote status to `rejected` (reuse existing status)
- Send a notification to the buyer: "Expert X has withdrawn their offer on [job title]"
- Remove the conversation from the seller's Quotes tab
- Show a confirmation dialog before withdrawing

**3. Auto-Expire Unanswered Quotes After 5 Days**

Update the existing `expire-stale-jobs` edge function to also handle individual quote expiration:
- Find quotes with status `pending` where `created_at` is older than 5 days AND the job is still `open`
- Update those quotes to status `expired`
- Notify the seller: "Your quote on [job title] expired after 5 days without response"

This complements the existing job-level expiration (which expires the whole job after 5 days).

**4. Enhance the SoldOrders Page**

Improve `SoldOrders.tsx` with:
- Add a "Delivered" tab for orders marked as delivered but awaiting buyer confirmation
- Show delivery countdown timer (3-day auto-release) on delivered orders
- Add clickability to completed/disputed orders (currently only active orders are clickable)
- Show the order status more prominently with color-coded borders

---

### Technical Details

#### Files to modify:

| File | Changes |
|---|---|
| `src/pages/ActiveRequest.tsx` | Add Tabs component to seller sidebar splitting "Quotes" vs "Orders"; add "Withdraw Quote" button + confirmation dialog in right panel; filter `sellerConvos` by job/quote status for each tab |
| `src/pages/SoldOrders.tsx` | Add "Delivered" tab filtering `escrow_status = 'delivered'`; make completed/disputed orders clickable; add auto-release countdown display; improve card styling with status-colored left borders |
| `supabase/functions/expire-stale-jobs/index.ts` | Add logic to expire individual pending quotes older than 5 days on still-open jobs; send notifications to affected sellers |

#### Database changes:
- No schema changes needed. The existing `quotes.status` field already supports `pending`, `accepted`, `rejected` values. We'll use `rejected` for seller-withdrawn and `expired` for auto-expired quotes.

#### Quote withdrawal flow:
1. Seller clicks "Withdraw Quote" in right panel
2. Confirmation dialog appears
3. On confirm: `UPDATE quotes SET status = 'rejected' WHERE id = quoteId`
4. Insert notification for buyer
5. Remove from seller's sidebar list
6. Toast confirmation

#### Auto-expiry addition to edge function:
```text
1. Query: quotes WHERE status = 'pending' AND created_at < 5_days_ago
2. Join with jobs WHERE status = 'open' (only expire if job is still open)
3. Update matched quotes to status = 'expired'  
4. Notify each seller about their expired quote
```

#### Seller sidebar tab structure:
```text
Sidebar Header: "My Orders" with back button
+-- TabsList: [Quotes (count)] [Orders (count)]
    |-- Quotes tab: sellerConvos where jobStatus = 'open' && quoteStatus = 'pending'
    |-- Orders tab: sellerConvos where jobStatus in ('accepted','completed','disputed')
```

