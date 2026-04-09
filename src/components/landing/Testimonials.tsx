import { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const gradients = [
  "from-blue-500/70 to-indigo-500/70",
  "from-emerald-400/70 to-teal-500/70",
  "from-amber-400/70 to-orange-500/70",
  "from-pink-400/70 to-rose-500/70",
  "from-violet-400/70 to-purple-500/70",
];
const emojis = ["🚀", "💡", "🎯", "⚡", "🔥"];

const testimonials = [
  { name: "Alex M.", role: "Buyer", content: "Posted a Minecraft server debug request at 11pm — had 3 quotes in 90 seconds. Fixed in 15 minutes for €8. Insane.", rating: 5, category: "Gaming", timeAgo: "2 days ago" },
  { name: "Sarah K.", role: "Expert", content: "I make €200/week just answering Discord bot questions in my spare time. The real-time pings mean I never miss a gig.", rating: 5, category: "Tech", timeAgo: "5 days ago" },
  { name: "Marcus J.", role: "Buyer", content: "Needed SEO help urgently before a launch. Got a quote in under a minute, expert delivered in 20 min. Worth every cent.", rating: 5, category: "Business", timeAgo: "1 week ago" },
  { name: "Elena R.", role: "Expert", content: "As a graphic designer, Druxio fills my downtime perfectly. Quick jobs, instant payment, no negotiations.", rating: 5, category: "Creative", timeAgo: "3 days ago" },
  { name: "Tom W.", role: "Buyer", content: "Hired someone to set up my Shopify store in under an hour. The escrow system meant zero risk. Will definitely use again.", rating: 5, category: "Business", timeAgo: "4 days ago" },
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
    <section ref={ref} className="bg-card/20 py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 md:mb-14 max-w-lg reveal">
          <p className="mb-2 md:mb-3 text-xs md:text-sm font-semibold uppercase tracking-widest text-primary">Testimonials</p>
          <h2 className="mb-2 md:mb-3 text-xl md:text-3xl font-bold text-foreground leading-tight">Don't take our word for it</h2>
          <p className="text-sm md:text-base text-muted-foreground">Real stories from our community</p>
        </div>

        <div className="relative reveal delay-200">
          {/* Nav arrows */}
          <div className="hidden lg:flex justify-between absolute -left-14 -right-14 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <Button variant="ghost" size="icon" className="pointer-events-auto h-10 w-10 rounded-full border border-border hover:bg-card"
              onClick={() => { setIsAutoPlaying(false); changeIndex((currentIndex - 1 + testimonials.length) % testimonials.length); }}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="pointer-events-auto h-10 w-10 rounded-full border border-border hover:bg-card"
              onClick={() => { setIsAutoPlaying(false); changeIndex((currentIndex + 1) % testimonials.length); }}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className={`grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 transition-all duration-300 ${isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
            {visible.map((t, i) => {
              const globalIdx = (currentIndex + i) % testimonials.length;
              return (
                <div
                  key={`${t.name}-${currentIndex}-${i}`}
                  className={`rounded-xl border border-border bg-card p-5 md:p-7 flex flex-col transition-all duration-300 hover:border-primary/30 ${i > 0 ? "hidden md:flex" : ""} ${i > 1 ? "md:hidden lg:flex" : ""}`}
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-3 md:mb-5">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 md:h-4 md:w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-[10px] md:text-xs border-primary/30 text-primary rounded-sm px-2 md:px-2.5">
                      {t.category}
                    </Badge>
                  </div>

                  <p className="text-sm md:text-[15px] text-foreground leading-relaxed flex-1 mb-4 md:mb-6 font-medium">"{t.content}"</p>

                  <div className="flex items-center gap-3">
                    {/* Gradient avatar with emoji */}
                    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br ${gradients[globalIdx % gradients.length]} flex items-center justify-center text-sm md:text-base`}>
                      {emojis[globalIdx % emojis.length]}
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">{t.role} · {t.timeAgo}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots */}
          <div className="mt-6 md:mt-10 flex justify-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => { setIsAutoPlaying(false); changeIndex(index); }}
                className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "w-6 md:w-8 bg-primary" : "w-2 bg-border/60"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
