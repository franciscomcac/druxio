import { useEffect } from "react";

const BASE_URL = "https://duxio.lovable.app";
const SITE_NAME = "Duxio";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

interface SeoOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
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

export function useSEO({ title, description, canonical, ogImage, ogType = "website", noIndex }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    const prevTitle = document.title;
    document.title = fullTitle;

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

    setMeta("og:title", fullTitle, "property");
    setMeta("twitter:title", fullTitle);
    setMeta("og:type", ogType, "property");
    setMeta("og:image", ogImage || DEFAULT_OG_IMAGE, "property");
    setMeta("twitter:image", ogImage || DEFAULT_OG_IMAGE);
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("twitter:card", "summary_large_image");

    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta("robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, canonical, ogImage, ogType, noIndex]);
}
