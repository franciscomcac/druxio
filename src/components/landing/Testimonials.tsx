import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const testimonials = [
  { name: "Alex M.", role: "Buyer", initials: "AM", content: "Posted a Minecraft server debug request at 11pm — had 3 quotes in 90 seconds. Fixed in 15 minutes for €8. Insane.", rating: 5, category: "Gaming", timeAgo: "2 days ago" },
  { name: "Sarah K.", role: "Expert", initials: "SK", content: "I make €200/week just answering Discord bot questions in my spare time. The real-time pings mean I never miss a gig.", rating: 5, category: "Tech", timeAgo: "5 days ago" },
  { name: "Marcus J.", role: "Buyer", initials: "MJ", content: "Needed SEO help urgently before a launch. Got a quote in under a minute, expert delivered in 20 min. Worth every cent.", rating: 5, category: "Business", timeAgo: "1 week ago" },
  { name: "Elena R.", role: "Expert", initials: "ER", content: "As a graphic designer, Duxio fills my downtime perfectly. Quick jobs, instant payment, no negotiations.", rating: 5, category: "Creative", timeAgo: "3 days ago" },
  { name: "Tom W.", role: "Buyer", initials: "TW", content: "Hired someone to set up my Shopify store in under an hour. The escrow system meant zero risk. Will definitely use again.", rating: 5, category: "Business", timeAgo: "4 days ago" },
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const ref = useScrollReveal<HTMLElement>();

  const changeIndex = (newIndex: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setIsTransitioning(false);
    }, 300);
  };

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      changeIndex((currentIndex + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, currentIndex]);

  const getVisible = () => {
    const items = [];
    for (let i = 0; i < 3; i++) {
      items.push(testimonials[(currentIndex + i) % testimonials.length]);
    }
    return items;
  };

  const visible = getVisible();

  return (
    <section ref={ref} className="bg-card/20 py-24">
      <div className="container mx-auto px-4">
        <div className="mb-14 max-w-lg reveal">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Testimonials</p>
          <h2 className="mb-3 text-4xl font-bold text-foreground leading-tight">Loved by Buyers & Experts</h2>
          <p className="text-muted-foreground text-lg">Real stories from our community</p>
        </div>

        <div className="relative reveal delay-200">
          {/* Nav arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 lg:flex h-10 w-10 rounded-full border border-border hover:bg-card"
            onClick={() => { setIsAutoPlaying(false); changeIndex((currentIndex - 1 + testimonials.length) % testimonials.length); }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 lg:flex h-10 w-10 rounded-full border border-border hover:bg-card"
            onClick={() => { setIsAutoPlaying(false); changeIndex((currentIndex + 1) % testimonials.length); }}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 transition-all duration-300 ${isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
            {visible.map((t, i) => (
              <div
                key={`${t.name}-${currentIndex}-${i}`}
                className="rounded-xl border border-border bg-card p-7 flex flex-col transition-all duration-300 hover:border-primary/30"
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary rounded-sm px-2.5">
                    {t.category}
                  </Badge>
                </div>

                <p className="text-[15px] text-foreground leading-relaxed flex-1 mb-6 font-medium">"{t.content}"</p>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="mt-10 flex justify-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => { setIsAutoPlaying(false); changeIndex(index); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "w-8 bg-primary" : "w-2 bg-border/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
