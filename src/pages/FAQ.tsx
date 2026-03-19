import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSEO } from "@/hooks/use-seo";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";

const faqSections = [
  {
    category: "Getting Started",
    items: [
      {
        q: "What is Druxio?",
        a: "Druxio is a real-time micro-task marketplace where clients post tasks and verified experts submit quotes within minutes. Unlike traditional freelance platforms, you don't search for an expert — they come to you. Once a quote is accepted, an escrow is created so both sides are protected.",
      },
      {
        q: "Who can use Druxio?",
        a: "Anyone can sign up as a client (buyer) to post tasks. Experts (sellers) go through a short onboarding to set their profile, skills, and hourly rate. Both roles can coexist — you can post tasks and accept tasks with the same account.",
      },
      {
        q: "Is Druxio free to join?",
        a: "Yes. Creating an account and browsing the platform is completely free. Clients only pay when they accept a quote. Experts pay a platform fee (deducted automatically) on completed earnings.",
      },
      {
        q: "How long does it take to receive quotes?",
        a: "Most requests receive their first quote within 2 minutes during active hours. Experts are notified instantly when a matching request is posted. If no quotes arrive within the deadline you set, the request expires and your funds are automatically refunded.",
      },
    ],
  },
  {
    category: "Posting a Request",
    items: [
      {
        q: "How do I post a task?",
        a: "Click 'Post a Request', choose a category, describe what you need, set a budget range and deadline. Your request is then broadcast to relevant experts on the platform in real time.",
      },
      {
        q: "What information should I include in my request?",
        a: "Be as specific as possible. Include the deliverable (e.g. 'fix a React bug that causes a crash on iOS'), any relevant files or links, your preferred format for delivery, and whether you need a live session or async work.",
      },
      {
        q: "Can I cancel a request?",
        a: "Yes, you can cancel an open request at any time before accepting a quote — no charge. Once a quote is accepted and escrow is funded, cancellation policies apply (see Terms of Service).",
      },
      {
        q: "What categories are available?",
        a: "We currently support: Software Development, Design & Creative, Writing & Content, Data & Analytics, Marketing, Business & Finance, Legal Advice, and more. New categories are added regularly based on demand.",
      },
    ],
  },
  {
    category: "Payments & Escrow",
    items: [
      {
        q: "How does escrow work?",
        a: "When you accept a quote, the agreed amount is held securely in escrow. The funds are only released to the expert once you confirm delivery or after the auto-release window expires (typically 72 hours after the expert marks the work as delivered).",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept payments via PayPal (credit/debit cards, PayPal balance, and bank transfers). All payments are processed securely through PayPal Checkout.",
      },
      {
        q: "What currencies does Druxio support?",
        a: "Druxio supports EUR, USD, GBP, CAD, AUD, CHF, and more. Your display currency can be changed in Settings → Currency. All transactions are processed securely via PayPal.",
      },
      {
        q: "What is the platform fee?",
        a: "Druxio charges a service fee on completed transactions. For clients, this is included in the quoted price. For experts, a percentage is deducted from each earned payment. Exact fee rates are shown before you confirm any transaction.",
      },
      {
        q: "How do I withdraw my earnings?",
        a: "Experts receive payouts directly to their PayPal account. Go to Wallet → Withdraw and enter your PayPal email to request a payout.",
      },
    ],
  },
  {
    category: "For Experts",
    items: [
      {
        q: "How do I become an expert on Druxio?",
        a: "Sign up, then complete the Expert Onboarding (accessible from your dashboard). You'll set your skills, hourly rate, availability, and add portfolio items. Once complete, you'll start receiving relevant task notifications.",
      },
      {
        q: "How do I submit a quote?",
        a: "Open an active request in the marketplace or from your notifications, review the details, and click 'Submit Quote'. Enter your price, estimated time, and a short message to the client. You can only submit one quote per request.",
      },
      {
        q: "What happens after my quote is accepted?",
        a: "You'll be notified immediately and an order is created. A chat channel opens with the client so you can clarify requirements, share files, and deliver your work. Once you've completed the task, mark it as delivered.",
      },
      {
        q: "Can I set my availability?",
        a: "Yes. In Settings → Availability, you can set which days and hours you're available to take on work. This helps clients know when to expect a response and helps Druxio match you with suitable requests.",
      },
    ],
  },
  {
    category: "Trust & Safety",
    items: [
      {
        q: "How does Druxio verify experts?",
        a: "All experts complete profile verification including identity checks and skills assessment. Ratings and reviews are collected after every completed order. Experts with repeated poor performance are removed from the platform.",
      },
      {
        q: "What if I'm not satisfied with the work?",
        a: "If a delivered result does not match the agreed scope, you can raise a dispute before confirming delivery. Our support team reviews the conversation, files, and scope, and mediates a fair resolution. Escrow is held throughout the dispute.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes. Druxio never stores your card details. All payment processing is handled by PayPal, a PCI-DSS Level 1 certified payment processor. Your data is encrypted in transit and at rest.",
      },
      {
        q: "How do I report a user or inappropriate content?",
        a: "Every order, message, and profile has a report button. You can also contact support directly via the Support widget (bottom right of any page). We investigate all reports within 24 hours.",
      },
    ],
  },
  {
    category: "Account & Settings",
    items: [
      {
        q: "How do I change my timezone?",
        a: "Go to Settings → Availability → Timezone. Your timezone affects how your availability schedule appears to clients and how deadlines are calculated.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Go to Settings → Account → Delete Account. Note: you must have no active orders or pending withdrawals before deletion. Completed order history may be retained for legal and financial compliance.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "Click 'Forgot password' on the login page and enter your email. You'll receive a password reset link within a few minutes. Check your spam folder if you don't see it.",
      },
    ],
  },
];

const FAQ = () => {
  useSEO({
    title: "FAQ — Druxio Help Center",
    description: "Find answers to common questions about Druxio — how to post tasks, hire freelancers, manage payments, escrow protection, and more.",
    canonical: "/faq",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqSections.flatMap((s) =>
        s.items.map((item) => ({
          "@type": "Question",
          "name": item.q,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.a,
          },
        }))
      ),
    },
  });

  return (
    <main className="min-h-screen py-16">
      <div className="container mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HelpCircle className="h-6 w-6" />
            </div>
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Druxio. Can't find your answer?{" "}
            <a href="mailto:support@druxio.net" className="text-primary underline underline-offset-4">
              Contact support
            </a>
            .
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {faqSections.map((section) => (
            <section key={section.category}>
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-medium">
                  {section.category}
                </Badge>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {section.items.map((item, i) => (
                  <AccordionItem key={i} value={`${section.category}-${i}`}>
                    <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 rounded-xl border border-border bg-card/50 p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">Still have questions?</h2>
          <p className="mb-6 text-muted-foreground">
            Our support team is available Monday–Friday, 9am–6pm CET.
          </p>
          <a
            href="mailto:support@druxio.net"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Email Support
          </a>
        </div>
      </div>

    </main>
  );
};

export default FAQ;
