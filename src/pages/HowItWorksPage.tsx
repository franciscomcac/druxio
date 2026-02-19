import HowItWorksDetailed from "@/components/landing/HowItWorksDetailed";
import { useSEO } from "@/hooks/use-seo";

const HowItWorksPage = () => {
  useSEO({
    title: "How It Works",
    description: "Learn how to post a task and get instant expert quotes on Duxio. Step-by-step guide to getting work done fast.",
    canonical: "/how-it-works",
  });

  return (
    <main>
      <HowItWorksDetailed />
    </main>
  );
};

export default HowItWorksPage;
