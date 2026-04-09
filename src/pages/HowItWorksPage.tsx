import HowItWorksDetailed from "@/components/landing/HowItWorksDetailed";
import { useSEO } from "@/hooks/use-seo";

const HowItWorksPage = () => {
  useSEO({
    title: "How Druxio Works — Post Tasks, Get Quotes",
    description: "Learn how to post a task and get instant expert quotes on Druxio. 4-step guide: post → get notified → compare quotes → done. Only 5% fee.",
    canonical: "/how-it-works",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Get Expert Help on Druxio",
        "description": "Post a task, receive real-time quotes from verified experts, and get your work done — all in minutes. Only 5% marketplace fee.",
        "totalTime": "PT5M",
        "step": [
          {
            "@type": "HowToStep",
            "position": 1,
            "name": "Post Your Task",
            "text": "Describe what you need help with. Choose from 8+ categories including tech, business, creative, gaming, and more. Our AI assistant helps you write a clear, complete brief so experts understand your request. It's completely free to post."
          },
          {
            "@type": "HowToStep",
            "position": 2,
            "name": "Experts Get Notified Instantly",
            "text": "Verified experts in the relevant category are notified in real time and submit competitive quotes within minutes. Up to 3 experts can quote on your request."
          },
          {
            "@type": "HowToStep",
            "position": 3,
            "name": "Compare & Hire",
            "text": "Review each expert's price, estimated delivery time, profile, ratings, and personal message. Accept the quote that fits your needs best — one click to hire."
          },
          {
            "@type": "HowToStep",
            "position": 4,
            "name": "Escrow Payment & Chat",
            "text": "Your payment is held safely in escrow. A private chat opens where you can share files and track progress. The expert doesn't get paid until you're satisfied."
          },
          {
            "@type": "HowToStep",
            "position": 5,
            "name": "Approve, Rate & Done",
            "text": "Review the delivered work, approve it to release payment, and leave a rating. Only 5% platform fee — no hidden costs. Auto-release after 48 hours if no dispute."
          }
        ],
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": ["h2", "h3", "p"]
        }
      }
    ],
  });

  return (
    <main>
      <HowItWorksDetailed />
    </main>
  );
};

export default HowItWorksPage;
