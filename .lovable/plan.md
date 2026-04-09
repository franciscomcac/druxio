

# Make Druxio Feel Hand-Crafted

## What we're doing
Applying 5 changes across the landing page to break the "AI template" feel: varied layouts, more personality, better typography, an interactive hero, and human-written copy.

---

## 1. Visual Variety — Break Section Symmetry

**Current problem**: Every section follows the same pattern: small label → big heading → uniform grid. It screams template.

**Changes**:
- **HowItWorks**: Left-align the header and switch from a 4-column uniform grid to a 2-column layout where step 01 is a large featured card (spanning full width or 2 cols) and steps 02-04 are stacked beside it
- **Categories**: Alternate between a featured "hero" category card (wider, taller) and smaller ones — e.g. first row has 1 large + 2 small, second row 3 small + 1 large
- **MentorSpotlight (Recent Requests)**: Replace the uniform 5-card grid with a masonry-style layout — cards with varying heights based on content length
- **Newsletter section**: Add a subtle rotated background shape or diagonal divider to break the flat rectangle pattern

## 2. Media & Personality — Replace Initials with Real Touches

**Changes**:
- **Testimonials**: Replace the `AM`, `SK` initial circles with colorful gradient avatars that feel designed (unique gradient per person, with an emoji or small illustration instead of letters)
- **Floating hero cards**: Add subtle hand-drawn-style borders or a slight skew variation so they don't all look identical
- **Footer**: Add a short tagline with personality, e.g. "Built by freelancers, for freelancers. Amsterdam, NL 🇳🇱"

## 3. Typography & Layout Variation

**Changes**:
- **Hero heading**: Make "Post a task." use a lighter weight (font-bold instead of font-extrabold) and "Get it done." heavier — creating contrast within the same line
- **Section headings**: Vary sizes — HowItWorks gets a larger heading, Testimonials gets a smaller one, Categories uses a different alignment (right-aligned on desktop)
- **Step numbers in HowItWorks**: Use a handwriting-style approach — make them oversized and semi-transparent as background elements rather than inline text

## 4. Interactive Hero — Live Task Preview

**Changes**:
- When the user types in the hero input, show a live preview card below/beside the input that simulates what their posted task would look like
- The card shows: their typed title, a randomly assigned category badge, a mock "Expert is quoting..." animation with a pulsing dot
- Card fades in smoothly when text length > 5 characters, fades out when cleared
- On mobile: card appears below the input; on desktop: appears as a floating card to the right

## 5. Human-Centric Copy Rewrite

**Changes across all landing sections**:

| Section | Current | New |
|---------|---------|-----|
| Hero heading | "Post a task. Get it done." | "Tell us what you need. We'll find someone great." |
| Hero subtitle | "Get verified quotes in under 2 minutes..." | "Describe your task, get quotes in seconds. Pay only when you're happy." |
| Hero trust row | "Escrow-protected" / "~90s response" / "500+ experts" | "Your money is safe" / "Replies in under 2 min" / "500+ verified pros" |
| HowItWorks label | "How It Works" | "Dead simple" |
| HowItWorks heading | "From request to done in four steps" | "Four steps. That's it." |
| Step titles | "Describe Your Need" → "Experts Get Notified" → "Compare & Hire" → "Done & Delivered" | "Say what you need" → "Experts jump in" → "Pick your favorite" → "Done. Pay. Rate." |
| Categories heading | "Find Your Expert" | "Whatever you need" |
| Recent Requests heading | "Recent Requests" | "Happening right now" |
| Testimonials heading | "Loved by Buyers & Experts" | "Don't take our word for it" |
| Newsletter heading | "Stay Updated" | "Want in?" |
| Become Expert | "Monetize your skills" | "Got skills? Get paid." |

---

## Files to modify

- `src/components/landing/Hero.tsx` — typography contrast, live preview card, copy
- `src/components/landing/HowItWorks.tsx` — asymmetric layout, oversized step numbers, copy
- `src/components/landing/Categories.tsx` — featured card layout, right-aligned header, copy
- `src/components/landing/MentorSpotlight.tsx` — masonry layout, copy
- `src/components/landing/Testimonials.tsx` — gradient avatars, copy
- `src/components/landing/Newsletter.tsx` — copy, subtle background shape
- `src/components/landing/LiveStats.tsx` — minor copy tweaks
- `src/components/layout/Footer.tsx` — personality tagline

