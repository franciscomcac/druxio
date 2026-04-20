import { lazy, Suspense } from "react";
import Hero from "@/components/landing/Hero";
import LiveStats from "@/components/landing/LiveStats";
import HowItWorks from "@/components/landing/HowItWorks";
import { useSEO } from "@/hooks/use-seo";

// Below-fold sections — lazy loaded
const MentorSpotlight = lazy(() => import("@/components/landing/MentorSpotlight"));
const Testimonials = lazy(() => import("@/components/landing/Testimonials"));
const Newsletter = lazy(() => import("@/components/landing/Newsletter"));

const Index = () => {
  useSEO({
    title: "Druxio — Hire Expert Freelancers | Only 5% Fee",
    description: "Post any task, get real-time quotes from verified freelancers in under 2 minutes. Only 5% marketplace fee — cheaper than Fiverr or Upwork. Escrow-protected payments.",
    canonical: "/",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Druxio Expert Marketplace",
        "description": "On-demand freelance marketplace with the lowest 5% fees. Post tasks in tech, business, design, gaming, and more — receive real-time quotes from verified experts. Escrow-protected payments, AI-assisted matching, and instant expert notifications.",
        "provider": {
          "@type": "Organization",
          "name": "Druxio",
          "url": "https://druxio.net"
        },
        "serviceType": "Freelance Expert Marketplace",
        "areaServed": "Worldwide",
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "USD",
          "lowPrice": "0",
          "description": "Free to post tasks. Only 5% marketplace fee — drastically lower than Fiverr (20%) or Upwork (10%)."
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "127",
          "bestRating": "5",
          "worstRating": "1"
        },
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": ["h1", "#hero-section p"]
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Druxio",
        "url": "https://druxio.net",
        "foundingDate": "2023",
        "description": "On-demand freelance expert marketplace with the industry's lowest 5% platform fee. Founded in 2023 as duxio.store, rebranded to druxio.net in March 2025.",
        "sameAs": [
          "https://x.com/druxiostore",
          "https://instagram.com/druxio_store",
          "https://tiktok.com/@druxio_store"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "support@duxio.store",
          "contactType": "customer support"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Druxio Service Categories",
        "description": "Browse 8+ expert categories on Druxio with the lowest 5% marketplace fee.",
        "numberOfItems": 8,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Tech — Discord Bots, Web Dev, SEO, Server Setup, App Dev, WordPress", "url": "https://druxio.net/category/tech" },
          { "@type": "ListItem", "position": 2, "name": "Business — Marketplace, Dropshipping, Accounting, Legal, Marketing, Startup", "url": "https://druxio.net/category/business" },
          { "@type": "ListItem", "position": 3, "name": "Creative — Ad Copy, Logo Design, Video Editing, Thumbnails, UI/UX, Branding", "url": "https://druxio.net/category/creative" },
          { "@type": "ListItem", "position": 4, "name": "Content — Streaming, YouTube, TikTok, Photography, Podcasting", "url": "https://druxio.net/category/content" },
          { "@type": "ListItem", "position": 5, "name": "Music — Production, Mixing, Guitar, Piano, Vocals, Beat Making", "url": "https://druxio.net/category/music" },
          { "@type": "ListItem", "position": 6, "name": "Fitness — Personal Training, Nutrition, Yoga, Weight Loss", "url": "https://druxio.net/category/fitness" },
          { "@type": "ListItem", "position": 7, "name": "Languages — English, Spanish, French, Japanese, German", "url": "https://druxio.net/category/languages" },
          { "@type": "ListItem", "position": 8, "name": "Gaming — Valorant, Arc Raiders, Fortnite, CS2, Apex, LoL", "url": "https://druxio.net/category/gaming" }
        ]
      }
    ],
  });

  return (
    <main>
      <Hero />
      <div className="cv-auto"><LiveStats /></div>
      <div className="cv-auto"><HowItWorks /></div>
      <Suspense fallback={null}>
        <div className="cv-auto"><MentorSpotlight /></div>
        <div className="cv-auto"><Testimonials /></div>
        <div className="cv-auto"><Newsletter /></div>
      </Suspense>
    </main>
  );
};

export default Index;
