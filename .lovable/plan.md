

## Transform the Requests Page into a Dedicated Seller Quotes Dashboard

### Goal
Turn the current `/request/:jobId` page into a focused, fast **Quotes Terminal** for sellers. This is where sellers spend most of their time responding to new customer requests, making/updating offers, and managing pending quotes. Orders (paid work) will be handled separately via `/orders/sold` and `/order/:jobId`.

---

### What Changes

**1. Remove the "Orders" tab from the seller sidebar**

The seller sidebar in `ActiveRequest.tsx` currently has two tabs: "Quotes" and "Orders". We'll remove the Orders tab entirely since those are already handled by the Sold Orders page (`/orders/sold`) and individual order pages (`/order/:jobId`). The sidebar becomes a flat list of all pending quote conversations -- no tabs needed.

**2. Redesign the sidebar as a Quotes Dashboard list**

Each sidebar item will show:
- Buyer name + avatar
- Job title + category badge
- Your quoted price + delivery time
- Time since quote was sent (e.g., "2h ago")
- Unread message indicator
- Visual urgency indicator for quotes nearing the 5-day expiry

The list will be sorted by: unread first, then most recent activity.

**3. Enhance the right panel into a Quote Action Center**

The right panel (currently just "Update Offer" + "Withdraw") becomes a compact, information-dense control panel:

- **Request Summary**: Job title, category, buyer's budget range, deadline
- **Your Current Offer**: Price + delivery time displayed prominently
- **Quick Actions**:
  - Update offer (price + delivery time form -- already exists, keep it)
  - Withdraw quote (already exists, keep it)
- **Quote Status**: Visual indicator showing "Pending", "Expired in Xd", etc.
- **Buyer Info**: Name, avatar, rating (if available), total spend

**4. Add quote expiry countdown**

Each quote sidebar item and the right panel will show how many days remain before the 5-day auto-expiry. Color-coded: green (3+ days), yellow (1-2 days), red (less than 1 day).

**5. Empty state improvements**

When no pending quotes exist, show a motivational empty state: "No pending quotes -- browse open requests to start quoting" with a CTA to go to the dashboard's open requests feed.

**6. Filter out non-pending quotes from the sidebar**

Only show quotes where `quoteStatus === 'pending'` AND `jobStatus === 'open'`. Rejected, expired, and accepted quotes should not appear here (they're handled elsewhere).

---

### Technical Details

#### File: `src/pages/ActiveRequest.tsx`

**Seller sidebar changes:**
- Remove the `Tabs` component wrapping "Quotes" / "Orders"
- Replace with a direct `ScrollArea` list of `quoteConvos` only
- Remove `sellerTab` state and `orderConvos` filtering
- Update sidebar header from "My Orders" to "Quotes"
- Add expiry countdown per item using `differenceInDays(addDays(new Date(quote.created_at), 5), new Date())`
- Sort sidebar: unread messages first, then by most recent `lastMessageAt`

**Right panel enhancements:**
- Add buyer's budget range display (`budget_min` - `budget_max`) from job data (need to fetch and store in `SellerConvo`)
- Add expiry countdown prominently at the top
- Add buyer rating/total spend if available
- Keep existing Update Offer form and Withdraw button
- Add a quick "Go to Dashboard" link in the header for browsing new requests

**Sidebar item redesign:**
- Add a small colored dot for expiry urgency (green/yellow/red)
- Show quote age: "Quoted 2h ago"
- Slightly larger touch targets for mobile-friendliness

#### Data changes to `SellerConvo` interface:
- Add `budgetMin: number` and `budgetMax: number` fields
- Add `quoteCreatedAt: string` field (already available from quotes query, just need to store it)
- These get populated from the existing `loadSellerConvos` function where we already fetch `budget_min` and `budget_max` from job data

#### No database changes needed
All data is already available. This is purely a frontend restructuring.

