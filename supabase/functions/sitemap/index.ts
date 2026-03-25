import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const BASE = "https://druxio.net";

// Static pages with priorities
const STATIC: [string, number, string][] = [
  ["/", 1.0, "daily"],
  ["/how-it-works", 0.8, "weekly"],
  ["/blog", 0.8, "daily"],
  ["/auth", 0.6, "monthly"],
  ["/faq", 0.6, "monthly"],
  ["/privacy", 0.3, "monthly"],
  ["/terms", 0.3, "monthly"],
  ["/cookies", 0.3, "monthly"],
];

// Blog slugs (hardcoded since they're in the codebase, not DB)
const BLOG_SLUGS = [
  "paypal-payments-now-live",
  "ai-auto-match-category-detection",
  "beta-launch-druxio-store",
  "how-druxio-works-for-clients",
  "expertise-without-borders",
];

function urlEntry(loc: string, priority: number, changefreq: string, lastmod?: string) {
  return `  <url>
    <loc>${BASE}${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const urls: string[] = [];

  // Static pages
  for (const [path, prio, freq] of STATIC) {
    urls.push(urlEntry(path, prio, freq));
  }

  // Blog posts
  for (const slug of BLOG_SLUGS) {
    urls.push(urlEntry(`/blog/${slug}`, 0.7, "monthly"));
  }

  // Categories
  const { data: categories } = await sb.from("categories").select("name").is("parent_category_id", null);
  if (categories) {
    for (const cat of categories) {
      const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      urls.push(urlEntry(`/category/${slug}`, 0.7, "weekly"));
    }
  }

  // Expert profiles (public — from the view)
  const { data: experts } = await sb
    .from("public_profiles")
    .select("id, updated_at")
    .not("bio", "is", null)
    .gt("total_sessions", 0)
    .limit(500);

  if (experts) {
    for (const e of experts) {
      const lastmod = e.updated_at ? e.updated_at.split("T")[0] : undefined;
      urls.push(urlEntry(`/mentor/${e.id}`, 0.6, "weekly", lastmod));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
