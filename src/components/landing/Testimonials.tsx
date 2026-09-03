import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

import alexImg from "@/assets/testimonials/alex.jpg";
import sarahImg from "@/assets/testimonials/sarah.jpg";
import marcusImg from "@/assets/testimonials/marcus.jpg";
import elenaImg from "@/assets/testimonials/elena.jpg";
import tomImg from "@/assets/testimonials/tom.jpg";

type T = { name: string; role: string; content: string; category: string; timeAgo: string; avatar: string };

const testimonials: T[] = [
  { name: "Alex M.", role: "Buyer", content: "Posted a Minecraft server debug at 11pm — 3 quotes in 90 seconds. Fixed in 15 minutes for €8. Insane.", category: "Gaming", timeAgo: "2 days ago", avatar: alexImg },
  { name: "Sarah K.", role: "Expert", content: "I make €200/week answering Discord bot questions in my spare time. The real-time pings mean I never miss a gig.", category: "Tech", timeAgo: "5 days ago", avatar: sarahImg },
  { name: "Marcus J.", role: "Buyer", content: "Needed SEO help before a launch. Quote in under a minute, delivered in 20. Worth every cent.", category: "Business", timeAgo: "1 week ago", avatar: marcusImg },
  { name: "Elena R.", role: "Expert", content: "As a designer, Druxio fills my downtime perfectly. Quick jobs, instant payment, no negotiations.", category: "Creative", timeAgo: "3 days ago", avatar: elenaImg },
  { name: "Tom W.", role: "Buyer", content: "Hired someone to set up my Shopify store in under an hour. The escrow meant zero risk. Using it again.", category: "Business", timeAgo: "4 days ago", avatar: tomImg },
];

function Card({ t }: { t: T }) {
  return (
    <figure className="glass w-[340px] shrink-0 rounded-xl p-5 mx-2.5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
          ))}
        </div>
        <Badge variant="outline" className="text-[10px] rounded-sm border-primary/30 text-primary px-2">
          {t.category}
        </Badge>
      </div>
      <blockquote className="text-[14px] leading-relaxed text-foreground/90 font-medium flex-1 mb-4">
        “{t.content}”
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <img src={t.avatar} alt={t.name} loading="lazy" width={36} height={36} className="h-9 w-9 rounded-full object-cover ring-2 ring-border" />
        <div>
          <p className="text-sm font-semibold text-foreground">{t.name}</p>
          <p className="text-[11px] text-muted-foreground">
            <span className={t.role === "Expert" ? "text-primary/80 font-medium" : ""}>{t.role}</span> · {t.timeAgo}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

const Testimonials = () => {
  const ref = useScrollReveal<HTMLElement>();
  // Two offset rows for visual richness, each duplicated for a seamless loop.
  const rowA = testimonials;
  const rowB = [...testimonials].reverse();

  return (
    <section ref={ref} className="relative overflow-hidden bg-background py-16 md:py-28">
      <div className="glow-blob bottom-[0%] left-[-5%] h-[360px] w-[360px] bg-primary/[0.06]" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center reveal">
          <p className="mb-3 text-xs md:text-sm font-semibold uppercase tracking-widest text-primary">Loved by both sides</p>
          <h2 className="mb-3 text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Buyers and experts, <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">both winning</span>.
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground">
            Real stories from a marketplace that pays out fast and takes almost nothing.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-12 md:mt-16 space-y-5 reveal delay-150">
        <div className="edge-fade-x marquee-pause overflow-hidden">
          <div className="marquee-track marquee-left">
            {[...rowA, ...rowA].map((t, i) => (
              <Card key={`ta-${i}`} t={t} />
            ))}
          </div>
        </div>
        <div className="edge-fade-x marquee-pause overflow-hidden">
          <div className="marquee-track marquee-right">
            {[...rowB, ...rowB].map((t, i) => (
              <Card key={`tb-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
