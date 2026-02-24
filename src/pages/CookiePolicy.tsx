import { Cookie } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="mb-4 text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const tableRows = [
  { name: "sb-session", type: "Essential", purpose: "Maintains your authenticated session", duration: "Session" },
  { name: "sb-refresh-token", type: "Essential", purpose: "Refreshes your login session automatically", duration: "7 days" },
  { name: "theme", type: "Functional", purpose: "Remembers your dark/light mode preference", duration: "1 year" },
  { name: "currency", type: "Functional", purpose: "Stores your preferred display currency", duration: "1 year" },
  { name: "_ga / _gid", type: "Analytics", purpose: "Google Analytics — measures page views and usage patterns (optional)", duration: "2 years / 1 day" },
];

const CookiePolicy = () => {
  useSEO({
    title: "Cookie Policy",
    description: "How Druxio uses cookies and similar technologies. Manage your cookie preferences.",
    canonical: "/cookie-policy",
  });

  return (
    <main className="min-h-screen py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cookie Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: 19 February 2026</p>
          </div>
        </div>

        <p className="mb-10 text-base leading-relaxed text-muted-foreground">
          Druxio uses cookies and similar technologies to provide, secure, and improve the Platform. This Cookie Policy explains what cookies are, which ones we use, and how you can control them.
        </p>

        <Section title="1. What Are Cookies?">
          <p>Cookies are small text files stored on your device when you visit a website. They allow the website to remember your preferences, maintain your session, and collect analytics data. Cookies can be "session" cookies (deleted when you close your browser) or "persistent" cookies (stored for a defined period).</p>
        </Section>

        <Section title="2. Cookies We Use">
          <p>We use the following categories of cookies:</p>
          <p><strong className="text-foreground">Essential cookies</strong> — required for the Platform to function. You cannot opt out of these.</p>
          <p><strong className="text-foreground">Functional cookies</strong> — remember your preferences (e.g. theme, currency). Disabling these may affect your experience.</p>
          <p><strong className="text-foreground">Analytics cookies</strong> — help us understand how users interact with Druxio. These are optional and can be declined.</p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="px-4 py-3 text-left font-medium text-foreground">Cookie</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Purpose</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Duration</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.purpose}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Third-Party Cookies">
          <p>Druxio integrates with the following third-party services that may set their own cookies:</p>
          <p><strong className="text-foreground">Stripe</strong> — payment processing. See <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">Stripe's Cookie Policy</a>.</p>
          <p><strong className="text-foreground">PayPal</strong> — payment processing. See <a href="https://www.paypal.com/uk/webapps/mpp/ua/cookie-full" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">PayPal's Cookie Policy</a>.</p>
          <p>We do not control these third-party cookies. Please review their policies for details.</p>
        </Section>

        <Section title="4. How to Control Cookies">
          <p>You can control and delete cookies through your browser settings. Common browser links:</p>
          <p>• <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">Google Chrome</a></p>
          <p>• <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">Mozilla Firefox</a></p>
          <p>• <a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">Safari</a></p>
          <p>• <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">Microsoft Edge</a></p>
          <p>Note: disabling essential cookies will prevent Druxio from functioning correctly.</p>
        </Section>

        <Section title="5. Changes to This Policy">
          <p>We may update this Cookie Policy to reflect changes in our practices or legal requirements. We will post the updated policy on this page with a new "Last updated" date.</p>
        </Section>

        <Section title="6. Contact">
          <p>For questions about our use of cookies, email <a href="mailto:support@druxio.store" className="text-primary underline underline-offset-4">support@druxio.store</a>.</p>
        </Section>
      </div>
    </main>
  );
};

export default CookiePolicy;
