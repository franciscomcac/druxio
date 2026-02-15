import { Star } from "lucide-react";

const testimonials = [
  { name: "Alex M.", role: "Buyer", content: "Posted a Minecraft server debug request at 11pm — had 3 quotes in 90 seconds. Fixed in 15 minutes for €8.", rating: 5 },
  { name: "Sarah K.", role: "Expert", content: "I make €200/week just answering Discord bot questions in my spare time. The real-time pings mean I never miss a gig.", rating: 5 },
  { name: "Marcus J.", role: "Buyer", content: "Needed SEO help urgently before a launch. Got a quote in under a minute, expert delivered in 20 min.", rating: 5 },
  { name: "Elena R.", role: "Expert", content: "As a graphic designer, Duxio fills my downtime perfectly. Quick jobs, instant payment, no negotiations.", rating: 5 },
  { name: "David L.", role: "Buyer", content: "The escrow system gives me confidence. I only pay when the work is actually done. No scams.", rating: 5 },
  { name: "Lisa T.", role: "Expert", content: "Best platform for micro-tasks. The fixed-price model means no scope creep. Post, deliver, get paid.", rating: 5 },
];

const Testimonials = () => {
  return (
    <section className="bg-card/20 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Testimonials</p>
          <h2 className="text-3xl font-bold text-foreground">Trusted by buyers & experts</h2>
        </div>

        <div className="grid gap-px md:grid-cols-2 lg:grid-cols-3 border border-border/30 rounded-sm overflow-hidden bg-border/30">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-card/60 p-6 flex flex-col gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed flex-1">"{t.content}"</p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/20">
                <div className="h-8 w-8 rounded-sm bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {t.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
