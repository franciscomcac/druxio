import Hero from "@/components/landing/Hero";
import LiveStats from "@/components/landing/LiveStats";
import HowItWorks from "@/components/landing/HowItWorks";
import MentorSpotlight from "@/components/landing/MentorSpotlight";
import Testimonials from "@/components/landing/Testimonials";
import Newsletter from "@/components/landing/Newsletter";
import { useSEO } from "@/hooks/use-seo";

const Index = () => {
  useSEO({
    title: "Druxio — Hire Expert Freelancers with Low Fees",
    description: "Post any task, get real-time quotes from verified experts in under 2 minutes. Only 5% marketplace fee — lower than Fiverr or Upwork. Escrow-protected payments.",
    canonical: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Druxio Expert Marketplace",
      "description": "On-demand freelance marketplace with industry-low 5% fees. Post tasks in tech, business, design, and more — receive real-time quotes from verified experts. Escrow-protected payments and AI-assisted matching.",
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
        "description": "Free to post tasks. Only 5% marketplace fee — drastically lower than traditional freelance platforms."
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
