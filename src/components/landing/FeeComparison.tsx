import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const platforms = [
  { name: "Fiverr", fee: 20, muted: true },
  { name: "Upwork", fee: 10, muted: true },
  { name: "Druxio", fee: 5, muted: false },
];

// On a €100 job, what the expert actually keeps.
const EXAMPLE = 100;

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

const FeeComparison = () => {
  const reveal = useScrollReveal<HTMLElement>();
  const { ref, inView } = useInView<HTMLDivElement>();
  const maxFee = Math.max(...platforms.map((p) => p.fee));

  return (
    <section ref={reveal} className="relative overflow-hidden bg-background py-16 md:py-28">
      <div className="glow-blob top-[10%] right-[-5%] h-[400px] w-[400px] bg-primary/[0.08]" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: the pitch */}
          <div className="reveal">
            <p className="mb-3 text-xs md:text-sm font-semibold uppercase tracking-widest text-primary">The math is simple</p>
            <h2 className="mb-4 text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Keep <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">95%</span> of what you earn.
            </h2>
            <p className="mb-6 text-sm md:text-lg text-muted-foreground leading-relaxed max-w-md">
              Other marketplaces quietly take a fifth of your money. We take a flat 5% — the lowest fee in the game — so more of every job stays in your pocket.
            </p>
            <ul className="mb-8 space-y-3">
              {[
                "Flat 5% fee — no hidden tiers or surprises",
                "Escrow-protected payments, released on approval",
                "Weekly payouts, set your own prices",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm md:text-base text-foreground/90">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                    <Check className="h-3 w-3" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/auth" onClick={() => localStorage.setItem("auth_redirect", "/dashboard?become_expert=1")}>
              <Button size="lg" className="gap-2 rounded-sm font-semibold">
                Start earning on Druxio <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Right: animated comparison bars */}
          <div ref={ref} className="glass-strong rounded-2xl p-6 md:p-8 reveal delay-200">
            <div className="flex items-baseline justify-between mb-6">
              <p className="text-sm font-medium text-foreground">Platform fee on a €100 job</p>
              <p className="text-xs text-muted-foreground">lower is better</p>
            </div>

            <div className="space-y-5">
              {platforms.map((p, i) => {
                const keeps = EXAMPLE - p.fee;
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-semibold ${p.muted ? "text-muted-foreground" : "text-primary"}`}>
                        {p.name}
                        {!p.muted && (
                          <span className="ml-2 rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary align-middle">
                            YOU
                          </span>
                        )}
                      </span>
                      <span className={`font-mono text-sm tabular-nums ${p.muted ? "text-muted-foreground" : "text-foreground font-bold"}`}>
                        {p.fee}% fee · keep €{keeps}
                      </span>
                    </div>
                    <div className="h-8 w-full rounded-md bg-muted/40 overflow-hidden">
                      <div
                        className={`grow-x h-full rounded-md ${inView ? "visible" : ""} ${
                          p.muted
                            ? "bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/25"
                            : "bg-gradient-to-r from-primary to-primary/70 shadow-glow"
                        }`}
                        style={{ width: `${(p.fee / maxFee) * 100}%`, animationDelay: `${i * 180}ms` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 pt-5 border-t border-border/60 text-center">
              <p className="text-sm text-muted-foreground">
                On that job you keep{" "}
                <span className="font-bold text-primary">€15 more</span> than on Fiverr.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeeComparison;
