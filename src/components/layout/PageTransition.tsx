import type { ReactNode } from "react";

// Lightweight page wrapper. The previous framer-motion fade added 200-300ms
// of compositing per navigation; a CSS fade keeps the perceived snappiness
// without re-painting the whole tree on the GPU.
const PageTransition = ({ children }: { children: ReactNode }) => (
  <div className="animate-in fade-in duration-150">{children}</div>
);

export default PageTransition;
