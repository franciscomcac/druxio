
# SEO and Crawler Optimization Plan

## Current State
The project already has a solid SEO foundation: `useSEO` hook for per-page meta, Open Graph/Twitter cards, JSON-LD Organization schema, FAQ page with FAQPage schema, robots.txt, and sitemap.xml. However, several improvements are needed to make Duxio appear more professional, trustworthy, and feature-rich to search engines.

## What Will Change

### 1. Fix Social Media Links in Structured Data
The `index.html` Organization JSON-LD has outdated/incorrect social links (`x.com/duxio_store` and `instagram.com/duxio_store`). These need to match the actual profiles:
- Twitter/X: `https://x.com/duxiostore`
- Instagram: `https://www.instagram.com/duxio_store/`

### 2. Add WebSite Search Action Schema (index.html)
Add a `WebSite` JSON-LD block with a `SearchAction` so Google can display a sitelinks search box pointing to the post-request page.

### 3. Add WebApplication JSON-LD (index.html)
Add structured data describing Duxio as a web application with its key features: escrow payments, real-time quotes, verified experts, multi-currency support, dispute resolution, etc. This surfaces the platform's legitimacy and capabilities to crawlers.

### 4. Add Per-Page JSON-LD Schemas
- **How It Works page**: Add a `HowTo` schema listing the 4 steps (post task, experts notified, compare & hire, done & delivered)
- **Index page**: Add a `Service` schema describing the marketplace offering, with `offers`, `provider`, and `areaServed`

### 5. Enhance useSEO Hook
- Add support for injecting JSON-LD structured data per page via the hook (new optional `jsonLd` parameter)
- Add `article:published_time` meta for blog posts

### 6. Update Sitemap
- Add missing public routes: `/category/gaming`, `/category/tech`, `/category/business`, `/category/creative`, `/category/music`, `/category/fitness`, `/category/languages`, `/category/content`
- Add `/post-request` as a public entry point

### 7. Enhance robots.txt
- Add `Disallow: /notifications` (private route currently missing)
- Add `Disallow: /mentor/` (profile pages indexed separately if needed later)

### 8. Add Missing OG/Meta to index.html
- Add `og:title` and `og:description` that are currently duplicated at the bottom of `<head>` -- clean up the duplicates so only one set exists

## What Will NOT Change
- No fake information will be added -- all schema data reflects actual platform features
- Testimonial names remain as-is (they are illustrative display names, not claimed to be real verified identities)
- No fabricated statistics or false claims

---

## Technical Details

### index.html changes
- Fix `sameAs` array in Organization schema to use correct social URLs
- Remove duplicate `og:title`, `og:description`, `twitter:title`, `twitter:description` tags at bottom of `<head>` (the `useSEO` hook sets these dynamically)
- Add `WebSite` JSON-LD with `SearchAction`
- Add `WebApplication` JSON-LD listing features

### src/hooks/use-seo.ts changes
- Add optional `jsonLd?: Record<string, unknown>` parameter
- When provided, inject/update a `<script type="application/ld+json">` tag with id `seo-jsonld` in document head
- Clean up on unmount

### src/pages/Index.tsx changes
- Pass a `Service` JSON-LD via useSEO describing Duxio's marketplace

### src/pages/HowItWorksPage.tsx changes
- Pass a `HowTo` JSON-LD via useSEO with the 4 steps

### public/sitemap.xml changes
- Add 9 new URL entries for category pages and post-request

### public/robots.txt changes
- Add `Disallow: /notifications`

### src/pages/Blog.tsx and src/pages/BlogPost.tsx
- Ensure blog listing has `CollectionPage` schema
- Ensure individual posts have `Article` schema with `datePublished`

**Files to modify:** `index.html`, `src/hooks/use-seo.ts`, `src/pages/Index.tsx`, `src/pages/HowItWorksPage.tsx`, `public/sitemap.xml`, `public/robots.txt`, `src/pages/Blog.tsx`, `src/pages/BlogPost.tsx`
