

## Per-Page SEO Meta Tags

### What This Does
Creates a reusable `useSEO` hook that dynamically sets the page title, meta description, canonical URL, Open Graph tags, and Twitter cards for every public route. This ensures each page has unique, crawlable metadata instead of sharing the same global tags from `index.html`.

### Pages Getting Unique SEO

| Route | Title | Description |
|---|---|---|
| `/` | Duxio -- Get Expert Help in Seconds | Post any task, receive real-time quotes... |
| `/how-it-works` | How It Works -- Duxio | Learn how to post a task and get instant expert quotes... |
| `/search` | Find Experts -- Duxio | Browse and search verified experts... |
| `/blog` | Blog -- Duxio | Tips, guides, and insights on getting work done... |
| `/blog/:slug` | [Post Title] -- Duxio | [Post excerpt] |
| `/category/:slug` | [Category Name] Experts -- Duxio | Find top [category] experts... |
| `/faq` | Frequently Asked Questions -- Duxio | Find answers to common questions... |
| `/auth` | Sign In -- Duxio | Create an account or sign in... |
| `/privacy` | Privacy Policy -- Duxio | How Duxio collects, uses, and protects your data... |
| `/terms` | Terms of Service -- Duxio | Terms and conditions for using Duxio... |
| `/cookie-policy` | Cookie Policy -- Duxio | How Duxio uses cookies... |
| `/mentor/:id` | [Expert Name] -- Duxio | [Expert tagline/bio excerpt] |

Private routes (dashboard, inbox, wallet, etc.) will get a title update only (no indexing needed since robots.txt blocks them).

### Technical Details

**1. New file: `src/hooks/use-seo.ts`**
- Accepts `title`, `description`, `canonical`, `ogImage`, `ogType`, and `noIndex` parameters
- Uses `useEffect` to update `document.title` and create/update `<meta>` and `<link>` tags in `<head>`
- Cleans up on unmount (restores defaults)
- Appends " | Duxio" suffix to titles automatically

**2. Update each page component**
- Add a single `useSEO({...})` call at the top of each page component
- For dynamic pages (blog posts, categories, mentor profiles), the hook will be called with data fetched at runtime

**3. Update `index.html`**
- Update the structured data `sameAs` array to use the new Twitter/X URL (`https://x.com/duxio_store`) and remove LinkedIn
- Add Instagram and TikTok to the `sameAs` array

**4. Update `robots.txt`**
- Update sitemap URL to use `duxio.store` if that's the production domain (or keep as-is)

### Implementation Order
1. Create `useSEO` hook
2. Add hook calls to all public pages (Index, HowItWorks, Search, Blog, BlogPost, CategoryPage, FAQ, Auth, Privacy, Terms, CookiePolicy, MentorProfile)
3. Add basic title-only calls to private pages (Dashboard, Settings, Wallet, etc.)
4. Update `index.html` structured data social links
