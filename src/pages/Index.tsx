import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import LiveStats from "@/components/landing/LiveStats";

import HowItWorks from "@/components/landing/HowItWorks";
import Categories from "@/components/landing/Categories";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import MentorSpotlight from "@/components/landing/MentorSpotlight";
import Newsletter from "@/components/landing/Newsletter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <LiveStats />
        
        <HowItWorks />
        <Categories />
        <MentorSpotlight />
        <Testimonials />
        <Pricing />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
