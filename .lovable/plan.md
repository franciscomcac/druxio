
# Feedback Form + Platform Improvements Plan

## What I Found Across the Codebase

After reviewing every major page and component (landing, dashboard, search, profile, post-request, inbox, wallet, settings, support widget, header, footer), here is a curated list of improvements — the same kind of QOL and flow enhancements you see on top-tier gig/marketplace platforms like Eldorado, Fiverr, or Toptal.

---

## The Feedback Form

A floating or embedded **"Give Feedback"** form where users can rate specific aspects of the platform and leave suggestions. This gets stored in the database for admin review.

The form will cover:

- **Overall experience** (star rating 1–5)
- **Category** (Posting a request / Finding an expert / Payments / Mobile experience / Other)
- **Specific suggestion or bug** (free text)
- **User type** (Client / Expert / Just browsing)
- **Optional email** for follow-up

It will appear as a small persistent button (bottom-left corner, opposite the support widget on bottom-right) and open a compact modal. Admins can read all feedback from the Admin panel.

---

## Identified Platform Improvements to Include in the Form as Suggestions (Pre-filled chips)

These are real gaps I spotted while reading the code:

### Landing Page
- No "Browse Experts" CTA button in the Hero — only "Post Task". Some users want to browse first
- The live stats bar (`LiveStats`) shows numbers but no context for new visitors
- Testimonials are hardcoded — no real reviews shown here even though reviews exist in the DB

### Search Page
- No sort options (by rating, price, sessions) — `filteredMentors` has no `.sort()`
- No empty state CTA when no experts match filters (just a generic "No experts found" message with no suggestions)
- Mobile filter drawer slides in but overlaps content instead of using a proper sheet

### Expert Profile Page
- No "Hire / Post a request for this expert" button on the sticky card — users can only heart or share
- The `About` tab is 3rd — Reviews should be last, About first (first impressions matter)

### Post Request Flow
- After posting, the "waiting" screen has a countdown but no way to edit the request
- The AI-refine step has no loading skeleton, just a spinner, making it feel slow

### Dashboard
- No quick "resume" button for open/expired jobs — users have to navigate away
- Expert dashboard has no earnings summary at a glance

### Inbox
- Sessions listed but no unread badge count visible in the tab UI on desktop
- No way to archive/hide old closed sessions

### Wallet
- No visual chart of balance history over time — just a flat list

### Settings
- No "danger zone" / account deletion section visible
- Rate-per-10min pricing isn't immediately obvious to new experts

### General / Mobile
- No bottom sticky navigation bar on mobile (Home, Inbox, Post, Wallet, Profile)
- Support widget sits on top of content on mobile without smart repositioning

---

## Technical Plan

### 1. Database Migration
Create a `feedback` table:
```sql
CREATE TABLE public.feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,  -- nullable (anon users can submit too)
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category text NOT NULL,
  message text NOT NULL,
  user_type text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- RLS: anyone can insert, admins can read
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read feedback" ON public.feedback FOR SELECT USING (is_admin(auth.uid()));
```

### 2. New Component: `src/components/feedback/FeedbackWidget.tsx`
- Floating button bottom-left (opposite side from support widget)
- Opens a `Dialog` with a multi-step form:
  - Step 1: Star rating + user type selector
  - Step 2: Category chips (Posting, Payments, Search, Mobile, Expert tools, Other)
  - Step 3: Free-text + optional email
  - Confirmation screen with thank-you message
- Pre-filled suggestion chips so users can one-tap common feedback
- Submits to `feedback` Supabase table
- No auth required (user_id attached if logged in)

### 3. Admin Panel — Feedback Tab
Add a "Feedback" tab to `src/pages/Admin.tsx` alongside the existing Support tab:
- Table of all feedback entries sorted by newest
- Color-coded star ratings (1-2 = red, 3 = yellow, 4-5 = green)
- Filter by category and rating
- Total count + average rating shown at top

### 4. Register `FeedbackWidget` globally in `src/App.tsx`
Same pattern as `SupportWidget` — placed inside `BrowserRouter` so it's available on all routes.

---

## Files to Create/Edit

| File | Action |
|---|---|
| `supabase/migrations/[timestamp].sql` | Create `feedback` table + RLS |
| `src/components/feedback/FeedbackWidget.tsx` | New floating feedback component |
| `src/App.tsx` | Register FeedbackWidget globally |
| `src/pages/Admin.tsx` | Add Feedback tab with table view |

---

## What the Feedback Form Covers (User-Facing)

The pre-filled suggestion chips inside the form will reflect exactly the real improvements listed above, so users can quickly tap what they want improved. This gives you actionable signal from real users about what to build next.
