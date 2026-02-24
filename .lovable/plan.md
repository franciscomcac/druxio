

## Landing Page UX & Conversion Improvements

After reviewing the AI's suggestions against the actual codebase, here's a filtered list of high-impact, actionable improvements. I've removed suggestions that are already implemented (e.g., expert benefits are already listed), impractical (e.g., payment provider logos in an iframe preview), or low-ROI.

---

### 1. Standardize CTA Label Across the Entire Site (P0)

Currently there are 4 different labels used interchangeably:
- "Post Task" (Hero button, Header desktop/mobile)
- "Post a Task" (HowItWorks section)
- "Post Your Request" (MentorSpotlight / Recent Requests)
- "Post a Request" (Footer, ClientDashboard, BlogPost, CategoryPage, FAQ text)

**Standardize everything to: "Post a Task"** -- it's short, action-oriented, and matches the hero headline "Post a task. Get it done."

Files to update:
- `src/components/landing/Hero.tsx` -- button text "Post Task" to "Post a Task"
- `src/components/layout/Header.tsx` -- desktop "Post Request" and mobile "Post Request" to "Post a Task"
- `src/components/landing/MentorSpotlight.tsx` -- "Post Your Request" to "Post a Task"
- `src/components/layout/Footer.tsx` -- "Post a Request" to "Post a Task"
- `src/components/dashboard/ClientDashboard.tsx` -- "Post a Request" to "Post a Task"
- `src/pages/BlogPost.tsx` -- "Post a Request" to "Post a Task"
- `src/pages/CategoryPage.tsx` -- "Post a Request" to "Post a Task"

---

### 2. Improve Hero Subtext with Quantified Reassurance (P1)

Current subtext: *"Describe what you need. Verified experts compete with fixed-price quotes in under 2 minutes."*

Replace with more compelling, trust-forward copy:

**New subtext:** *"Get verified quotes in under 2 minutes. Escrow-protected -- you only pay when satisfied."*

Also update the trust microcopy line below the input from generic bullets to include the fee advantage:

**Current:** "Free to post . No commitment . Pay only when satisfied"
**New:** "Free to post . Only 5% fee . Escrow-protected"

File: `src/components/landing/Hero.tsx`

---

### 3. Add Visible Label and Helper Text to Hero Input (P0)

The hero input currently has no visible label (only an animated placeholder). This is an accessibility issue.

- Add an `aria-label="Describe your task"` to the input
- Add a small helper text below the form: *"Describe any task -- our AI matches you with the right expert"*

File: `src/components/landing/Hero.tsx`

---

### 4. Add Visible Label to Newsletter Email Input (P1)

The newsletter email input uses only a placeholder with no visible label or privacy microcopy.

- Add a visible `<Label>` element: "Your email"
- Add privacy microcopy below the form: *"No spam. Unsubscribe anytime."*

File: `src/components/landing/Newsletter.tsx`

---

### 5. Improve Stats Legibility (P2)

The LiveStats section uses `text-2xl` for stat values and `text-[11px]` for labels -- both are small for quick scanning.

- Increase stat values to `text-3xl` with `font-extrabold`
- Increase labels to `text-xs`
- Add a timestamp: "Updated just now" to add real-time credibility

File: `src/components/landing/LiveStats.tsx`

---

### 6. Enhance Testimonials with Verifiable Context (P1)

Testimonials currently lack timestamps or context. Add a "time ago" string to each testimonial to make them feel current and real.

Add a `timeAgo` field to each testimonial (e.g., "2 days ago", "1 week ago") and display it.

Also replace one Gaming testimonial with a Business/Tech one for category balance. Currently 2 of 5 are Gaming-tagged.

File: `src/components/landing/Testimonials.tsx`

---

### Technical Summary

| File | Changes |
|---|---|
| `Hero.tsx` | Standardize CTA to "Post a Task", update subtext, add aria-label, add helper text, update trust microcopy |
| `Header.tsx` | Change "Post Request" to "Post a Task" (desktop + mobile) |
| `MentorSpotlight.tsx` | Change "Post Your Request" to "Post a Task" |
| `Footer.tsx` | Change "Post a Request" to "Post a Task" |
| `ClientDashboard.tsx` | Change "Post a Request" to "Post a Task" |
| `BlogPost.tsx` | Change "Post a Request" to "Post a Task" |
| `CategoryPage.tsx` | Change "Post a Request" to "Post a Task" |
| `Newsletter.tsx` | Add visible label, privacy microcopy |
| `LiveStats.tsx` | Increase font sizes, add "Updated just now" |
| `Testimonials.tsx` | Add time context, rebalance categories |

