import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HowItWorksDetailed from "@/components/landing/HowItWorksDetailed";

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HowItWorksDetailed />
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorksPage;
