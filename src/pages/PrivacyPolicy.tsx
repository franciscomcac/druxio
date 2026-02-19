import { Shield } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="mb-4 text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: 19 February 2026</p>
          </div>
        </div>

        <p className="mb-10 text-base leading-relaxed text-muted-foreground">
          Duxio ("we", "our", "us") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data. By using Duxio you agree to the practices described here.
        </p>

        <Section title="1. Information We Collect">
          <p><strong className="text-foreground">Account data:</strong> When you register, we collect your email address, display name, and password (hashed). If you choose, you can also add a profile photo, bio, location, and skills.</p>
          <p><strong className="text-foreground">Transaction data:</strong> We record details of requests, quotes, orders, payments, and withdrawals to operate the escrow system and resolve disputes. We do not store your full card number — payments are processed by Stripe and PayPal.</p>
          <p><strong className="text-foreground">Communications:</strong> Messages sent through Duxio's in-app chat are stored to enable the service and support dispute resolution.</p>
          <p><strong className="text-foreground">Usage data:</strong> We collect standard web logs including IP address, browser type, pages visited, and timestamps. We use this data to improve the platform and detect fraud.</p>
          <p><strong className="text-foreground">Cookies:</strong> We use essential session cookies and optional analytics cookies. See our Cookie Policy for details.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>• To provide, operate, and improve the Duxio platform.</p>
          <p>• To process payments, manage escrow, and handle withdrawals.</p>
          <p>• To communicate service updates, security alerts, and support messages.</p>
          <p>• To detect, investigate, and prevent fraudulent or illegal activity.</p>
          <p>• To comply with legal obligations (e.g. financial regulations, tax reporting).</p>
          <p>• To send optional marketing emails if you have opted in (you can opt out at any time).</p>
        </Section>

        <Section title="3. Sharing Your Information">
          <p>We do not sell your personal data. We share data only in the following circumstances:</p>
          <p><strong className="text-foreground">With other users:</strong> Your public profile (display name, rating, skills, response time) is visible to other Duxio users. Messages within an order are visible to both parties in that order.</p>
          <p><strong className="text-foreground">With service providers:</strong> We use Stripe (payments), Supabase (database), and Resend (email) as processors. They access only what's necessary to deliver their service.</p>
          <p><strong className="text-foreground">Legal requirements:</strong> We may disclose data when required by law, court order, or to protect Duxio's legal rights.</p>
        </Section>

        <Section title="4. Data Retention">
          <p>We retain your account data for as long as your account is active. Transaction records are retained for a minimum of 7 years to comply with financial regulations. If you delete your account, personal data is anonymised or deleted within 30 days except where legal retention obligations apply.</p>
        </Section>

        <Section title="5. International Transfers">
          <p>Duxio operates globally. Your data may be processed in countries outside the EEA (including the United States). Where transfers occur, we rely on Standard Contractual Clauses or other approved mechanisms to ensure adequate protection.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>Depending on your jurisdiction you may have the right to: access your personal data, correct inaccurate data, request deletion ("right to be forgotten"), restrict or object to processing, and data portability. To exercise these rights, email <a href="mailto:privacy@duxio.app" className="text-primary underline underline-offset-4">privacy@duxio.app</a>. We will respond within 30 days.</p>
        </Section>

        <Section title="7. Security">
          <p>All data is encrypted in transit (TLS 1.2+) and at rest. We use row-level security policies on our database and conduct regular security reviews. Despite these measures, no system is completely secure — please use a strong, unique password and enable two-factor authentication when available.</p>
        </Section>

        <Section title="8. Children">
          <p>Duxio is not intended for users under 18 years of age. We do not knowingly collect personal data from children. If you believe a child has registered, please contact us and we will delete the account promptly.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this policy from time to time. We will notify you of significant changes by email or by posting a notice on the platform. Continued use of Duxio after changes constitutes acceptance.</p>
        </Section>

        <Section title="10. Contact">
          <p>For privacy-related questions or requests, contact our Data Protection team at <a href="mailto:privacy@duxio.app" className="text-primary underline underline-offset-4">privacy@duxio.app</a>.</p>
        </Section>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
