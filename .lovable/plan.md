
# Unified Messenger — `/inbox` Redesign

## The Problem

Currently, chats are fragmented across three different places:
- `/inbox` — shows only **paid/accepted** sessions (cards you click to navigate away)
- `/request/:jobId` — sellers have a split-pane view but it's **tied to one job URL**
- `/order/:jobId` — buyers and sellers chat **after payment**, separately

There is no single place where a user can see all their conversations and reply without navigating between pages.

---

## The Solution: Full-Screen Split-Pane Messenger at `/inbox`

Inspired by the El Dorado reference image — a persistent two-panel layout that never navigates away. Every conversation type lives in the left sidebar, every chat opens in the right panel.

```text
┌──────────────────┬─────────────────────────────────────────────┐
│  LEFT SIDEBAR    │  RIGHT PANEL — Active Chat                  │
│  (320px fixed)   │                                             │
│                  │  ┌─────────────────────────────────────────┐│
│  🔍 Search       │  │  Header: Avatar + Name + Status badge   ││
│                  │  │  Sub: "Order for Gaming: Valorant"      ││
│  ─── ACTIVE ─── │  ├─────────────────────────────────────────┤│
│  [Avatar] Alex   │  │                                         ││
│  Order: Gaming   │  │  [Chat messages — ScrollArea]           ││
│  hey thanks 5m   │  │                                         ││
│  [•] 2 unread   │  │  📋 Order Details card (auto-msg)       ││
│                  │  │  💼 Offer card (auto-msg)               ││
│  [Avatar] Jay    │  │                                         ││
│  Quote: CS2      │  │  [Regular bubbles]                      ││
│  i can help...   │  │                                         ││
│                  │  ├─────────────────────────────────────────┤│
│  ─── OFFERS ─── │  │  [Input bar] [Send]                     ││
│  [Avatar] Maria  │  └─────────────────────────────────────────┘│
│  Live Request    │                                             │
│  Pending reply   │                                             │
└──────────────────┴─────────────────────────────────────────────┘
```

---

## Conversation Types to Aggregate

The sidebar will pull **all** conversation types for the logged-in user:

| Type | Source | Who sees it | Badge |
|------|--------|-------------|-------|
| Active Order (paid) | `jobs` with `status=accepted/completed` + linked `sessions` | Buyer & Seller | 🟢 Order |
| Quote Chat (live request, not yet paid) | `quotes` with linked `sessions` | Seller only | 🟡 Quote |
| Delivered, awaiting confirm | `jobs` where `delivered_at` is set | Buyer & Seller | 🟠 Delivered |

For buyers, they see their **accepted order** chats.  
For sellers, they see **both** accepted orders AND all live quote conversations.

---

## Technical Plan

### 1. Replace `src/pages/Inbox.tsx` entirely

Transform it from a card-list navigation page into a **full-height messenger app** component.

**Key layout change:** Move `/inbox` out of the "with footer" route group in `App.tsx` and into the "no footer, full screen" group (same as `/dashboard`).

**Sidebar data loading:**
- Fetch all `sessions` where `mentor_id = userId OR mentee_id = userId`
- For each session, look up the linked `job` (via `quotes` table: `expert_id + mentee_id` pair → `job_id`)
- Enrich with: other party's `profile`, `last_message`, `unread_count`, `job.status`, `job.title`, `job.category`
- Classify into: `order` (accepted) | `quote` (pending) | `delivered`
- Sort by: unread first, then by `last_message.created_at` descending

**Sidebar UI (`ConversationList` component):**
- Search bar to filter by name or job title
- Section headers: "Orders" | "Quotes & Offers"
- Each row: Avatar (with online dot) | Name | Job title subtitle | Last message preview | Time | Unread badge
- Active conversation highlighted with `bg-primary/10 border-l-2 border-primary`
- Real-time updates via Supabase channel subscription on `messages` table

**Chat Panel (`ChatPanel` component):**
- Header: Avatar + name + status badge + link icon to navigate to the full order/request page
- Messages in `ScrollArea`, auto-scroll to bottom on new message
- Styled auto-message cards (📋 Order Details, 💼 Offer) identical to what already exists in `ActiveRequest.tsx`
- Image support (preview + lightbox) inherited from `Order.tsx`
- Textarea input (shift+enter for newline, enter to send) — already the standard
- Real-time subscription per `session_id`, switches when conversation changes

**Mobile:** On small screens, sidebar fills full width with a back button; selecting a conversation slides in the chat panel.

### 2. Update `App.tsx`

Move `/inbox` from the "with footer" layout group to the "no footer, full-screen" group:

```tsx
// Before (has footer):
<Route path="/inbox" element={<Inbox />} />

// After (no footer, full height):
// In the showFooter={false} group:
<Route path="/inbox" element={<Inbox />} />
```

### 3. Real-time Strategy

One Supabase channel subscribed at the **page level**:
```ts
supabase.channel('inbox-global')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleNewMessage)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, handleSessionUpdate)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs' }, handleJobUpdate)
  .subscribe()
```

When a new message arrives:
- If it belongs to the **active conversation** → append to chat view
- Always update the sidebar preview (last message + unread count)

### 4. Component Structure

```text
src/pages/Inbox.tsx (rewritten)
  ├── <ConversationList>  (left sidebar)
  │     ├── Search input
  │     ├── Section: "Orders"
  │     ├── Section: "Quotes"
  │     └── <ConversationRow> × N
  └── <ChatPanel>  (right panel)
        ├── Chat header
        ├── <ScrollArea> messages
        │     └── renderMessageBubble() (reused logic)
        └── Input bar
```

All in a single `Inbox.tsx` file to keep things simple and co-located.

### 5. No Database Changes Needed

All data already exists:
- `sessions` → chat containers
- `messages` → messages
- `quotes` → links sellers to jobs/sessions
- `jobs` → order context
- `profiles` → avatars and names

---

## What Stays the Same

- `/order/:jobId` remains for viewing full order details (delivery, dispute, review)
- `/request/:jobId` remains for buyers to view the leaderboard of quotes
- The chat panel in `/inbox` will show a **"View Full Order"** link button in the header to navigate there when relevant

---

## Files to Change

1. **`src/pages/Inbox.tsx`** — full rewrite into split-pane messenger
2. **`src/App.tsx`** — move `/inbox` to the no-footer route group
