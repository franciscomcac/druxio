
## Add "Schedule a Call" Feature to Orders

### What We're Building

A polished way for sellers (and buyers) on the Order page to initiate a Google Meet video call directly from the order chat. The seller clicks a button, a Google Meet room link is generated instantly (no manual copy-paste needed), and it gets sent as a rich, clickable card in the chat so the buyer can join with one click.

### How It Works

```text
Seller clicks "Schedule a Call"
         |
         v
Dialog opens with:
  - "Create a Google Meet" button (opens meet.google.com/new in a new tab)
  - Input to paste the generated link back
  - "Send to Chat" button
         |
         v
Link is sent as a special rich message in the order chat
         |
         v
Buyer sees a "Join Video Call" card with green video icon + Join button
Both parties can click to join anytime
```

### Why Google Meet (Not a Custom Solution)?

- **Zero backend cost** — Google Meet is free for all users
- **No API key required** — `meet.google.com/new` instantly creates a room
- **Familiar & trusted** — Screen sharing, recording, captions all built in
- **Works on any device** — Mobile and desktop

### Changes to Make

**1. `src/pages/Order.tsx` — Add the Video Call button & UI**

- Import `Video`, `ExternalLink` icons (already exist in the project)
- Add state: `meetDialogOpen`, `meetLink`
- Add a "Video Call" button in the left sidebar actions panel — visible to **both seller and buyer** when the order is active (not completed/cancelled)
- The dialog contains:
  - A prominent "Open Google Meet" button that opens `https://meet.google.com/new` in a new tab
  - An input field to paste the generated link back
  - A "Send Link to Chat" button
- When sent, insert the message into the `messages` table with special content format: `📹 Video Call: <url>`

**2. `src/pages/Order.tsx` — Render Meet links as rich cards in chat**

- Update the message rendering loop to detect messages containing `meet.google.com` or the `📹 Video Call:` prefix
- Instead of plain text, render a styled card with:
  - Green video camera icon
  - "Join Video Call" text
  - Clickable button that opens the link

**3. `src/pages/Session.tsx` — Align with the same improved UX**

- The Session page already has a basic version of this (a dialog with a paste input), but it lacks the "Open Google Meet" shortcut button
- Add the `href="https://meet.google.com/new"` quick-create link to the existing dialog so it matches the Order page experience

### Visual Layout of the Meet Card in Chat

```text
┌─────────────────────────────────────────┐
│  📹  Video Call Scheduled               │
│                                         │
│  meet.google.com/abc-defg-hij           │
│                                         │
│  [  Join Call  →  ]                     │
└─────────────────────────────────────────┘
```

### No Database Changes Needed

The Meet link is just sent as a regular chat message in the existing `messages` table — no new columns or tables required. The special rendering is purely frontend-side by detecting the URL pattern in message content.

### Technical Details

- The "Schedule a Call" button will appear in the left sidebar of the Order page, below the existing seller/buyer action buttons, visible to both parties as long as the order is active
- `meet.google.com/new` always creates a fresh room instantly — no account required for guests to join
- Detection regex: `/meet\.google\.com\//` or message starts with `📹 Video Call:`
- The rich card replaces the plain text render for those matching messages only
