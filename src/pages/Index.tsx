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
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Druxio Expert Marketplace",
      "description": "On-demand freelance marketplace with the lowest 5% fees. Post tasks in tech, business, design, gaming, and more — receive real-time quotes from verified experts. Escrow-protected payments, AI-assisted matching, and instant expert notifications.",
      "provider": {
        "@type": "Organization",
        "name": "Druxio",
        "url": "https://druxio.lovable.app"
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
      }
    },
  });

  return (
    <main>
      <Hero />
      <LiveStats />
      <HowItWorks />
      <Suspense fallback={null}>
        <MentorSpotlight />
        <Testimonials />
        <Newsletter />
      </Suspense>
    </main>
  );
};

export default Index;
