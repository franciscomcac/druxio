import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  { id: 1, name: "Alex M.", role: "Buyer", content: "Posted a Minecraft server debug request at 11pm — had 3 quotes in 90 seconds. Fixed in 15 minutes for €8. Insane.", rating: 5, category: "Gaming" },
  { id: 2, name: "Sarah K.", role: "Expert", content: "I make €200/week just answering Discord bot questions in my spare time. The real-time pings mean I never miss a gig.", rating: 5, category: "Tech" },
  { id: 3, name: "Marcus J.", role: "Buyer", content: "Needed SEO help urgently before a launch. Got a quote in under a minute, expert delivered in 20 min. Worth every cent.", rating: 5, category: "Business" },
  { id: 4, name: "Elena R.", role: "Expert", content: "As a graphic designer, Duxio fills my downtime perfectly. Quick jobs, instant payment, no negotiations.", rating: 5, category: "Creative" },
  { id: 5, name: "David L.", role: "Buyer", content: "The escrow system gives me confidence. I only pay when the work is actually done. No scams.", rating: 5, category: "Gaming" },
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const visibleTestimonials = [
    testimonials[currentIndex],
    testimonials[(currentIndex + 1) % testimonials.length],
    testimonials[(currentIndex + 2) % testimonials.length],
  ];

  return (
    <section className="bg-card/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">What People Say</h2>
          <p className="text-muted-foreground">Buyers and experts love the speed</p>
        </div>

        <div className="relative">
          <Button variant="outline" size="icon" className="absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full lg:flex" onClick={() => { setIsAutoPlaying(false); setCurrentIndex((p) => (p - 1 + testimonials.length) % testimonials.length); }}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full lg:flex" onClick={() => { setIsAutoPlaying(false); setCurrentIndex((p) => (p + 1) % testimonials.length); }}>
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleTestimonials.map((t, i) => (
              <Card key={`${t.id}-${i}`} className="relative overflow-hidden border-border bg-card transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <Quote className="absolute -right-2 -top-2 h-16 w-16 text-primary/5" />
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="mb-6 text-foreground">"{t.content}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {t.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                  <div className="absolute right-4 top-4">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{t.category}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((_, index) => (
              <button key={index} onClick={() => { setIsAutoPlaying(false); setCurrentIndex(index); }} className={`h-2 w-2 rounded-full transition-all ${index === currentIndex ? "w-6 bg-primary" : "bg-border"}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
