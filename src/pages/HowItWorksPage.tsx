import HowItWorksDetailed from "@/components/landing/HowItWorksDetailed";
import { useSEO } from "@/hooks/use-seo";

const HowItWorksPage = () => {
  useSEO({
    title: "How It Works",
    description: "Learn how to post a task and get instant expert quotes on Duxio. Step-by-step guide to getting work done fast.",
    canonical: "/how-it-works",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Get Expert Help on Duxio",
      "description": "Post a task, receive real-time quotes from verified experts, and get your work done — all in minutes.",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Post Your Task",
          "text": "Describe what you need help with. Our AI assistant helps you write a clear, complete brief so experts understand your request."
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Experts Get Notified",
          "text": "Verified experts in the relevant category are notified in real time and submit competitive quotes within minutes."
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Compare & Hire",
          "text": "Review each expert's price, estimated time, profile, ratings, and message. Accept the quote that fits your needs best."
        },
        {
          "@type": "HowToStep",
          "position": 4,
          "name": "Done & Delivered",
          "text": "Collaborate in a secure session workspace with real-time chat. Your payment is held in escrow until you confirm the work is complete."
        }
      ]
    },
  });

  return (
    <main>
      <HowItWorksDetailed />
    </main>
  );
};

export default HowItWorksPage;
