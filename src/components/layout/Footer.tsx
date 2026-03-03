import { Link } from "react-router-dom";
import { Zap, Twitter, Instagram } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Post a Task", href: "/post-request" },
    { label: "Become an Expert", href: "/auth" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Categories", href: "/#categories" },
  ],
  Company: [
    { label: "Blog", href: "/blog" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Contact", href: "mailto:support@druxio.net" },
  ],
  Support: [
    { label: "FAQ", href: "/faq" },
    { label: "Email Support", href: "mailto:support@druxio.net" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookie-policy" },
  ],
};

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="mb-4 md:mb-5 flex items-center">
              <span className="text-xl font-bold text-foreground">Drux<Zap className="inline h-4 w-4 -mx-0.5" style={{ color: 'hsl(188 100% 48%)', fill: 'hsl(188 100% 48%)' }} />o</span>
            </Link>
            <p className="mb-4 md:mb-6 max-w-xs text-xs md:text-sm text-muted-foreground leading-relaxed">
              Real-time micro-tasks platform. Post what you need, get expert quotes in seconds.
            </p>
            <div className="flex gap-3">
              {[
                { icon: <Twitter className="h-4 w-4" />, href: "https://x.com/druxiostore", label: "Twitter" },
                { icon: <Instagram className="h-4 w-4" />, href: "https://www.instagram.com/druxio_store/", label: "Instagram" },
                { icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.56a8.28 8.28 0 0 0 4.84 1.56V6.69h-1.08Z"/></svg>, href: "https://tiktok.com/@druxio_store", label: "TikTok" },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-300 hover:bg-primary/[0.08] hover:text-primary hover:border-primary/20" aria-label={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 md:contents">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="mb-3 md:mb-4 text-xs md:text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h4>
                <ul className="space-y-2 md:space-y-2.5">
                  {links.map((link) => (
                    <li key={link.href}>
                      {link.href.startsWith("mailto:") || link.href.startsWith("http") ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs md:text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">{link.label}</a>
                      ) : link.href.startsWith("/#") ? (
                        <a href={link.href} className="text-xs md:text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">{link.label}</a>
                      ) : (
                        <Link to={link.href} className="text-xs md:text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">{link.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 md:mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 md:pt-8 md:flex-row">
          <p className="text-xs md:text-sm text-muted-foreground">© {new Date().getFullYear()} Druxio. All rights reserved.</p>
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 items-center justify-center rounded bg-[#1a1f71] px-2">
                <svg width="36" height="12" viewBox="0 0 36 12" fill="none"><text x="0" y="11" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="12" fill="white" fontStyle="italic">VISA</text></svg>
              </div>
              <div className="flex h-7 items-center justify-center rounded bg-muted/60 px-2">
                <svg width="28" height="18" viewBox="0 0 28 18"><circle cx="10" cy="9" r="8" fill="#eb001b"/><circle cx="18" cy="9" r="8" fill="#f79e1b"/><path d="M14 2.8a8 8 0 0 1 0 12.4 8 8 0 0 1 0-12.4z" fill="#ff5f00"/></svg>
              </div>
              <div className="flex h-7 items-center justify-center rounded bg-[#006fcf] px-2">
                <span className="text-[9px] font-bold text-white tracking-tight">AMEX</span>
              </div>
              <div className="flex h-7 items-center justify-center rounded bg-[#635bff] px-2.5">
                <span className="text-[10px] font-bold text-white">stripe</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50">Secured by Stripe · 256-bit SSL encryption</p>
          </div>
          <span className="text-xs md:text-sm text-muted-foreground">🇪🇺 EUR payments via Stripe</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
