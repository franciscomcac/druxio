import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Startup Founder",
    avatar: "",
    content: "Found a marketing expert who helped me launch my product in 2 weeks. The ROI was insane — best money I ever spent!",
    rating: 5,
    category: "Marketing",
  },
  {
    id: 2,
    name: "Marcus Johnson",
    role: "Software Developer",
    avatar: "",
    content: "Was stuck on a React bug for 3 hours. Connected with an expert who solved it in 10 minutes. Absolute lifesaver!",
    rating: 5,
    category: "Web Dev",
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    role: "Content Creator",
    avatar: "",
    content: "My streaming setup was a mess. A pro helped me optimize everything — now I have 3x more viewers!",
    rating: 5,
    category: "Streaming",
  },
  {
    id: 4,
    name: "David Kim",
    role: "Aspiring Musician",
    avatar: "",
    content: "Took guitar lessons here and learned more in one month than a year of YouTube tutorials. Real mentors make a difference.",
    rating: 5,
    category: "Music",
  },
  {
    id: 5,
    name: "Lisa Thompson",
    role: "Fitness Enthusiast",
    avatar: "",
    content: "My nutrition coach helped me lose 20 lbs in 3 months. Personalized advice beats generic fitness apps any day.",
    rating: 5,
    category: "Fitness",
  },
  {
    id: 6,
    name: "James Wilson",
    role: "Small Business Owner",
    avatar: "",
    content: "Got legal advice that saved me from a costly mistake. The expert explained everything in plain English. Worth every penny!",
    rating: 5,
    category: "Legal",
  },
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

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const visibleTestimonials = [
    testimonials[currentIndex],
    testimonials[(currentIndex + 1) % testimonials.length],
    testimonials[(currentIndex + 2) % testimonials.length],
  ];

  return (
    <section className="bg-card/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            People Love Us
          </h2>
          <p className="text-muted-foreground">
            Join thousands who've achieved their goals with expert help
          </p>
        </div>

        <div className="relative">
          {/* Navigation buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute -left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full lg:flex"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full lg:flex"
            onClick={goToNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Testimonial cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleTestimonials.map((testimonial, index) => (
              <Card
                key={`${testimonial.id}-${index}`}
                className="relative overflow-hidden border-border bg-card transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <Quote className="absolute -right-2 -top-2 h-16 w-16 text-primary/5" />
                  
                  {/* Rating */}
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="mb-6 text-foreground">"{testimonial.content}"</p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={testimonial.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>

                  {/* Category badge */}
                  <div className="absolute right-4 top-4">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {testimonial.category}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Dots indicator */}
          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setCurrentIndex(index);
                }}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentIndex ? "w-6 bg-primary" : "bg-border"
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
