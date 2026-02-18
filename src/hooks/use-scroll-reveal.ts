import { useEffect, useRef } from "react";

/**
 * Attach to a container ref — all children with the class `reveal`,
 * `reveal-left`, `reveal-right`, or `reveal-scale` inside it will
 * animate in when they enter the viewport.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  rootMargin = "0px 0px -80px 0px"
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const selectors = ".reveal, .reveal-left, .reveal-right, .reveal-scale";
    const targets = Array.from(container.querySelectorAll<HTMLElement>(selectors));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin, threshold: 0.08 }
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [rootMargin]);

  return ref;
}
