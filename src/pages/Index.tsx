import Hero from "@/components/landing/Hero";
import LiveStats from "@/components/landing/LiveStats";
import HowItWorks from "@/components/landing/HowItWorks";
import MentorSpotlight from "@/components/landing/MentorSpotlight";
import Testimonials from "@/components/landing/Testimonials";
import Newsletter from "@/components/landing/Newsletter";
import { useSEO } from "@/hooks/use-seo";

const Index = () => {
  useSEO({
    title: "Duxio — Get Expert Help in Seconds",
    description: "Post any task, receive real-time quotes from verified experts in under 2 minutes. Escrow-protected payments. No browsing, no waiting.",
    canonical: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Duxio Expert Marketplace",
      "description": "On-demand marketplace where clients post tasks and receive real-time quotes from verified experts. Escrow-protected payments, AI-assisted matching, and built-in dispute resolution.",
      "provider": {
        "@type": "Organization",
        "name": "Duxio",
        "url": "https://duxio.lovable.app"
      },
      "serviceType": "Expert Consultation & Micro-Task Marketplace",
      "areaServed": "Worldwide",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free to post tasks. Pay only when you accept an expert quote."
      }
    },
  });

  return (
    <main>
      <Hero />
      <LiveStats />
      <HowItWorks />
      <MentorSpotlight />
      <Testimonials />
      <Newsletter />
    </main>
  );
};

export default Index;
