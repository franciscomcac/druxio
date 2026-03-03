import { FileText } from "lucide-react";
import { useSEO } from "@/hooks/use-seo";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="mb-4 text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const TermsOfService = () => {
  useSEO({
    title: "Terms of Service",
    description: "Terms and conditions for using Druxio. Understand your rights, responsibilities, escrow policy, and dispute resolution as a buyer or expert.",
    canonical: "/terms",
  });

  return (
    <main className="min-h-screen py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: 19 February 2026</p>
          </div>
        </div>

        <p className="mb-10 text-base leading-relaxed text-muted-foreground">
          These Terms of Service ("Terms") govern your access to and use of Druxio ("the Platform"). By creating an account or using any part of the Platform, you agree to be bound by these Terms. Please read them carefully.
        </p>

        <Section title="1. Definitions">
          <p><strong className="text-foreground">"Druxio"</strong> means the platform operated at druxio.lovable.app and its associated services.</p>
          <p><strong className="text-foreground">"Client"</strong> means a registered user who posts tasks and purchases expert services.</p>
          <p><strong className="text-foreground">"Expert"</strong> means a registered user who submits quotes and delivers services.</p>
          <p><strong className="text-foreground">"Order"</strong> means a confirmed agreement between a Client and Expert after a quote is accepted.</p>
          <p><strong className="text-foreground">"Escrow"</strong> means funds held by Druxio on behalf of both parties pending completion of an Order.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 18 years old to use Druxio. By registering, you represent that all information you provide is accurate and complete. Druxio reserves the right to terminate accounts found to be in breach of eligibility requirements.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>You are responsible for maintaining the confidentiality of your login credentials. You agree to notify Druxio immediately of any unauthorised access to your account. Druxio is not liable for any loss resulting from unauthorised use of your account.</p>
          <p>You may not create multiple accounts, use another person's account, or use automated means to create accounts.</p>
        </Section>

        <Section title="4. Posting Requests">
          <p>Clients may post task requests describing the work required, budget range, and deadline. By posting a request, you agree not to request work that is: illegal, offensive, discriminatory, involves intellectual property you do not own, or violates any third-party rights.</p>
          <p>Druxio reserves the right to remove any request that violates these Terms or our community standards without notice.</p>
        </Section>

        <Section title="5. Quoting and Accepting">
          <p>Experts may submit one quote per request. Quotes must accurately represent the scope, price, and timeline of the proposed work. Misleading quotes may result in account suspension.</p>
          <p>When a Client accepts a quote, an Order is created and an Escrow is funded. Both parties are legally committed to fulfil their respective obligations.</p>
        </Section>

        <Section title="6. Payments & Escrow">
          <p>Clients fund Escrow via Stripe at the time of quote acceptance. Druxio holds these funds until the Order is marked as delivered and confirmed by the Client, or until the auto-release window expires.</p>
          <p><strong className="text-foreground">Auto-release:</strong> If a Client does not confirm or dispute delivery within 72 hours of the Expert marking the work as delivered, funds are automatically released to the Expert.</p>
          <p><strong className="text-foreground">Platform fee:</strong> Druxio deducts a service fee from Expert earnings on each completed Order. The fee percentage is displayed on your profile during onboarding and may change with 30 days' notice.</p>
          <p><strong className="text-foreground">Refunds:</strong> If a request expires with no accepted quote, funds are returned to the Client's wallet. If an Order is cancelled before delivery, refunds are subject to the dispute resolution outcome.</p>
        </Section>

        <Section title="7. Delivery & Completion">
          <p>Experts must deliver work that materially meets the agreed scope within the agreed timeframe. Once the Expert marks the Order as delivered, the Client has 72 hours to confirm or raise a dispute.</p>
          <p>Confirming delivery releases the Escrow to the Expert. Clients are encouraged to review deliverables promptly.</p>
        </Section>

        <Section title="8. Disputes">
          <p>If a Client believes delivered work does not meet the agreed scope, they may open a dispute within the 72-hour confirmation window. Druxio's support team will review evidence from both parties (messages, files, order details) and issue a resolution. Druxio's decision is final.</p>
          <p>Abusing the dispute system to avoid valid payments may result in account suspension.</p>
        </Section>

        <Section title="9. Withdrawals">
          <p>Experts may withdraw available wallet balances via supported methods (PayPal, bank transfer, or crypto). Minimum withdrawal amounts and processing times vary by method. Druxio reserves the right to delay withdrawals pending compliance checks.</p>
        </Section>

        <Section title="10. Prohibited Conduct">
          <p>You agree not to: use the Platform for any illegal purpose; circumvent Druxio's payment system (e.g. transacting off-platform to avoid fees); post false information or impersonate others; scrape, crawl, or otherwise extract data from the Platform; attempt to compromise Platform security; or harass or threaten other users.</p>
          <p>Violations may result in immediate account termination and, where appropriate, legal action.</p>
        </Section>

        <Section title="11. Intellectual Property">
          <p>Upon full payment of an Order, the Expert assigns all intellectual property rights in the delivered work to the Client, unless otherwise agreed in writing within the Order.</p>
          <p>Druxio retains ownership of the Platform itself, including all design, code, trademarks, and content created by Druxio.</p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p>Druxio acts solely as a marketplace and is not a party to contracts between Clients and Experts. To the maximum extent permitted by law, Druxio's total liability for any claim arising from use of the Platform is limited to the fees paid by you to Druxio in the 3 months preceding the claim.</p>
          <p>Druxio is not liable for indirect, incidental, or consequential damages including loss of profit, data, or business opportunity.</p>
        </Section>

        <Section title="13. Termination">
          <p>You may close your account at any time. Druxio may suspend or terminate your account if you violate these Terms or for any other reason with reasonable notice, except in cases of serious or repeated breaches where immediate termination applies.</p>
          <p>Upon termination, outstanding Orders will be handled per the dispute resolution process. Pending withdrawals will be processed subject to compliance requirements.</p>
        </Section>

        <Section title="14. Changes to These Terms">
          <p>We may update these Terms from time to time. We will notify you by email and via in-app notice at least 14 days before material changes take effect. Continued use of Druxio after the effective date constitutes acceptance.</p>
        </Section>

        <Section title="15. Governing Law">
          <p>These Terms are governed by the laws of the European Union and, where applicable, the laws of the jurisdiction in which Druxio is registered. Any dispute arising shall first be attempted to be resolved amicably. If not resolved within 30 days, disputes shall be submitted to binding arbitration or the competent courts of the EU member state in which Druxio is registered.</p>
        </Section>

        <Section title="16. Contact">
          <p>For questions about these Terms, contact us at <a href="mailto:support@druxio.net" className="text-primary underline underline-offset-4">support@druxio.net</a>.</p>
        </Section>
      </div>
    </main>
  );
};

export default TermsOfService;
