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
