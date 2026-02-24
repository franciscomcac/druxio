

## SEO Improvements Plan

### 1. Sync `index.html` static meta with `useSEO`

Update the static meta tags in `index.html` (lines 8-9, 18-19, 30-31) to match the current `Index.tsx` useSEO values -- specifically the "Low Fees" messaging and "5% marketplace fee" description. This ensures crawlers that read the pre-hydration HTML see the same messaging as the dynamic hook sets.

**Changes to `index.html`:**
- Title: "Duxio -- Hire Expert Freelancers with Low Fees"
- Description: "Post any task, get real-time quotes from verified experts in under 2 minutes. Only 5% marketplace fee -- lower than Fiverr or Upwork. Escrow-protected payments."
- Update `og:title`, `og:description`, `twitter:title`, `twitter:description` to match

---

### 2. Add BreadcrumbList JSON-LD to blog posts

**File: `src/pages/BlogPost.tsx`**

Extend the existing `jsonLd` in the `useSEO` call to an array containing both the current `Article` schema and a new `BreadcrumbList` schema:

```
Home > Blog > [Post Title]
```

This gives Google a breadcrumb trail in search results.

---

### 3. Add BreadcrumbList JSON-LD to category pages

**File: `src/pages/CategoryPage.tsx`**

Extend the `jsonLd` to an array containing both the current `ItemList` and a new `BreadcrumbList`:

```
Home > [Category Label]
```

---

### 4. Pass blog `ogImage` (coverImage) to `useSEO`

**File: `src/pages/BlogPost.tsx`**

Add `ogImage: post?.coverImage` to the `useSEO` call so social shares use the article's cover image instead of the default fallback.

---

### 5. Add Person schema to mentor profiles

**File: `src/pages/MentorProfile.tsx`**

Add JSON-LD to the existing `useSEO` call with a `Person` schema including `name`, `description` (bio), `image` (avatar), `jobTitle`, `url`, and an `AggregateRating` when reviews exist.

---

### 6. Reduce gaming examples in hero task pool

**File: `src/components/landing/Hero.tsx`**

Currently `taskPool` has 4 gaming entries out of 16 (25%). Reduce to 2 (Valorant coaching + one Minecraft/Roblox entry) and replace the removed ones with non-gaming examples (e.g., Shopify store setup, resume writing). Similarly trim `placeholderExamples` from ~4 gaming entries down to 2 and add non-gaming replacements.

---

### Technical Summary

| File | Change |
|---|---|
| `index.html` | Sync static meta title + description with low-fees messaging |
| `src/pages/BlogPost.tsx` | Add `ogImage`, add `BreadcrumbList` JSON-LD |
| `src/pages/CategoryPage.tsx` | Add `BreadcrumbList` JSON-LD |
| `src/pages/MentorProfile.tsx` | Add `Person` + `AggregateRating` JSON-LD |
| `src/components/landing/Hero.tsx` | Replace 2 gaming taskPool entries and 2 gaming placeholders with non-gaming examples |

