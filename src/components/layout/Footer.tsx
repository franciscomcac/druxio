import { Link } from "react-router-dom";
import { Zap, Github, Twitter, Linkedin, Youtube } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Find Mentors", href: "/search" },
    { label: "Become a Mentor", href: "/apply" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Categories", href: "/#categories" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Support: [
    { label: "Help Center", href: "/help" },
    { label: "FAQ", href: "/faq" },
    { label: "Community", href: "/community" },
    { label: "Discord", href: "https://discord.gg" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

const socialLinks = [
  { icon: <Twitter className="h-5 w-5" />, href: "https://twitter.com", label: "Twitter" },
  { icon: <Github className="h-5 w-5" />, href: "https://github.com", label: "GitHub" },
  { icon: <Linkedin className="h-5 w-5" />, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: <Youtube className="h-5 w-5" />, href: "https://youtube.com", label: "YouTube" },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        {/* Main footer content */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Micro<span className="text-primary">Mentor</span>
              </span>
            </Link>
            <p className="mb-6 max-w-xs text-sm text-muted-foreground">
              Connect with expert developers and get instant help with your coding challenges.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 font-semibold text-foreground">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MicroMentor. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">🌍 Global</span>
            <span className="text-sm text-muted-foreground">USD / EUR / GBP</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
