import { useEffect } from "react";

const BASE_URL = "https://druxio.net";
const SITE_NAME = "Druxio";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/G0936umxfkP8XUxHjCHkuY6oOfS2/social-images/social-1771596374263-Screenshot_2026-02-20_140526.webp";

interface SeoOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  articlePublishedTime?: string;
}

function setMeta(name: string, content: string, attribute = "name") {
  let el = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSEO({ title, description, canonical, ogImage, ogType = "website", noIndex, jsonLd, articlePublishedTime }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    // Keep title under 60 chars for SERP display
    const truncatedTitle = fullTitle.length > 60 ? fullTitle.slice(0, 57) + "…" : fullTitle;
    const prevTitle = document.title;
    document.title = truncatedTitle;

    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, "property");
      setMeta("twitter:description", description);
    }

    if (canonical) {
      const url = canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`;
      setLink("canonical", url);
      setMeta("og:url", url, "property");
    }

    setMeta("og:title", truncatedTitle, "property");
    setMeta("twitter:title", truncatedTitle);
    setMeta("og:type", ogType, "property");
    setMeta("og:image", ogImage || DEFAULT_OG_IMAGE, "property");
    setMeta("twitter:image", ogImage || DEFAULT_OG_IMAGE);
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("twitter:card", "summary_large_image");

    if (articlePublishedTime) {
      setMeta("article:published_time", articlePublishedTime, "property");
    }

    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta("robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    }

    // JSON-LD injection
    const jsonLdId = "seo-page-jsonld";
    let scriptEl = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = jsonLdId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      document.title = prevTitle;
      const el = document.getElementById(jsonLdId);
      if (el) el.remove();
    };
  }, [title, description, canonical, ogImage, ogType, noIndex, jsonLd, articlePublishedTime]);
}
