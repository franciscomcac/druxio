import Hero from "@/components/landing/Hero";
import LiveStats from "@/components/landing/LiveStats";
import HowItWorks from "@/components/landing/HowItWorks";
import MentorSpotlight from "@/components/landing/MentorSpotlight";
import Testimonials from "@/components/landing/Testimonials";
import Newsletter from "@/components/landing/Newsletter";

const Index = () => {
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
