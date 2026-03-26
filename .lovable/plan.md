

## Plan: Implement 5 Features (Reviews Enhancement, Verification Badges, Order Follow-up, Referral Program, Saved Drafts)

Based on the user's selection of items 3, 4, 5, 6, and 8 from the previous suggestions.

---

### 1. Enhanced Review/Rating System
**What**: Add verified purchase badges on reviews, helpful vote counts, and seller response capability.

- Add a `verified_purchase` boolean display on reviews (derived from checking if a completed session exists between reviewer and reviewee)
- Add a "Helpful" button on each review in `MentorProfile.tsx` (store in a new `review_votes` table)
- Show a "Verified Purchase" badge next to reviews where the reviewer had a completed order with that expert
- Allow experts to reply to reviews (add `reply` and `replied_at` columns to `reviews` table)

**DB changes**: 
- New `review_votes` table (id, review_id, user_id, created_at) with RLS
- Add `reply` (text, nullable) and `replied_at` (timestamptz, nullable) columns to `reviews`

---

### 2. Expert Verification Badges
**What**: Visual trust indicators on expert profiles showing milestones.

- Create a `getVerificationBadges()` utility that computes badges from profile data:
  - "Verified Expert" — completed 10+ orders
  - "Top Rated" — rating_avg >= 4.8 with 5+ reviews
  - "Fast Responder" — response_time_minutes <= 10
  - "Rising Star" — 5+ completed orders, joined < 30 days ago
- Display badges on `MentorProfile.tsx`, expert cards in `ActiveRequest.tsx`, and `SimilarExperts.tsx`
- No DB changes needed — computed from existing profile data

---

### 3. Order Completion Follow-up Flow
**What**: After an order is marked completed, prompt the buyer for a review and suggest related experts.

- In `Order.tsx`, after status changes to "completed", show a follow-up card:
  - Review prompt (already exists as dialog — auto-open it)
  - "Need more help?" CTA linking to `/post-request` pre-filled with same category
  - "Similar Experts" section using the `SimilarExperts` component
- Add a "Was this helpful?" satisfaction survey (thumbs up/down) stored in the session's `notes` field

---

### 4. Referral/Invite Program
**What**: Users get a unique referral link; both referrer and invitee earn wallet credit on first completed order.

**DB changes**:
- New `referrals` table: id, referrer_id (uuid), referred_email (text), referred_user_id (uuid, nullable), status (pending/registered/rewarded), reward_amount (numeric, default 2.00), created_at
- Add `referred_by` column to `profiles` table (uuid, nullable)
- RLS: users can view/create their own referrals; system updates status

**Implementation**:
- New `/settings` tab or section: "Invite Friends" with unique link (`druxio.lovable.app/?ref=USER_ID`)
- On signup, detect `ref` param from URL, store in `profiles.referred_by` and create referral record
- Edge function or DB trigger: when referred user completes first order, credit both wallets with bonus (e.g. $2.00)
- Dashboard widget showing referral stats (invited, registered, earned)

---

### 5. Saved Drafts for Task Posting
**What**: Auto-save PostRequest form state so users don't lose progress.

- In `PostRequest.tsx`, debounce-save form state to `localStorage` every 3 seconds
- On page load, check for saved draft and show a "Resume draft?" banner
- Clear draft on successful submission
- Store: category, subcategory, title, description, budget, deadline, template fields
- No DB changes — purely client-side with localStorage

---

### Technical Details

**Files to create**:
- `src/lib/verification-badges.ts` — badge computation logic
- `src/components/experts/VerificationBadges.tsx` — badge display component
- `src/components/order/OrderFollowUp.tsx` — post-completion follow-up card
- `src/components/referral/ReferralSection.tsx` — invite UI for settings
- `src/hooks/use-draft.ts` — localStorage draft auto-save hook

**Files to modify**:
- `src/pages/MentorProfile.tsx` — verified badges, review replies, helpful votes
- `src/pages/Order.tsx` — follow-up flow after completion
- `src/pages/PostRequest.tsx` — draft auto-save/restore
- `src/pages/Settings.tsx` — referral tab
- `src/pages/Auth.tsx` — capture `ref` param on signup
- `src/components/experts/SimilarExperts.tsx` — add verification badges

**Database migrations**:
1. `review_votes` table + RLS
2. `reviews` table: add `reply`, `replied_at` columns
3. `referrals` table + RLS
4. `profiles` table: add `referred_by` column

