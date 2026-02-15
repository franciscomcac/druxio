import { Link } from "react-router-dom";
import { Zap, Github, Twitter, Linkedin } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Post a Request", href: "/post-request" },
    { label: "Become an Expert", href: "/auth" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Categories", href: "/#categories" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  Support: [
    { label: "Help Center", href: "/help" },
    { label: "FAQ", href: "/faq" },
    { label: "Discord", href: "https://discord.gg" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
                <Zap className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-foreground">Duxio</span>
            </Link>
            <p className="mb-6 max-w-xs text-sm text-muted-foreground leading-relaxed">
              Real-time micro-tasks platform. Post what you need, get expert quotes in seconds.
            </p>
            <div className="flex gap-3">
              {[
                { icon: <Twitter className="h-4 w-4" />, href: "https://twitter.com", label: "Twitter" },
                { icon: <Github className="h-4 w-4" />, href: "https://github.com", label: "GitHub" },
                { icon: <Linkedin className="h-4 w-4" />, href: "https://linkedin.com", label: "LinkedIn" },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-300 hover:bg-primary/[0.08] hover:text-primary hover:border-primary/20" aria-label={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Duxio. All rights reserved.</p>
          <span className="text-sm text-muted-foreground">🇪🇺 EUR payments via Stripe</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
