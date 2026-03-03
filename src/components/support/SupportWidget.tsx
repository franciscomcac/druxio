import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, X, ChevronLeft, Send, Loader2,
  User, Briefcase, ChevronRight, Headphones, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// ─── Config ────────────────────────────────────────────────────────────────

const FLOW: Record<string, Record<string, string[]>> = {
  client: {
    "Payments & Wallet": [
      "My payment didn't go through",
      "I want to add funds to my wallet",
      "I was charged incorrectly",
      "I need a refund",
    ],
    "Orders & Requests": [
      "My expert didn't deliver",
      "I want to cancel my order",
      "The delivery was late",
      "I need to open a dispute",
    ],
    "Account & Profile": [
      "I can't log in to my account",
      "I want to change my email",
      "My account was banned",
      "I want to delete my account",
    ],
    "Finding Experts": [
      "I can't find a good expert",
      "An expert is behaving badly",
      "I want to report an expert",
      "Other question",
    ],
  },
  expert: {
    "Payments & Earnings": [
      "My withdrawal wasn't processed",
      "I haven't received payment",
      "I have a tax question",
      "I want to set up Stripe payouts",
    ],
    "Orders & Delivery": [
      "I can't access my active order",
      "The buyer is unresponsive",
      "I need more time to deliver",
      "I want to cancel an order",
    ],
    "Account & Profile": [
      "I can't log in",
      "I want to update my skills",
      "My account is restricted",
      "I want to become verified",
    ],
    "Rules & Policies": [
      "I got a warning — why?",
      "What are the platform fees?",
      "What is allowed in orders?",
      "Other question",
    ],
  },
};

const FAQ: Record<string, { q: string; a: string }[]> = {
  // ── Client FAQs ──
  "My payment didn't go through": [
    { q: "Did you check your card details?", a: "Please verify your card number, expiry and CVV are entered correctly." },
    { q: "Is your card 3D-Secure enabled?", a: "Some payments require 3D-Secure verification from your bank. Check your banking app for a pending confirmation." },
    { q: "Try a different payment method", a: "If your card payment fails, try a different card or contact your bank. If it still fails, contact live support below." },
  ],
  "I want to add funds to my wallet": [
    { q: "How do I top up?", a: "Payments are processed at checkout via Stripe. There's no need to pre-fund your wallet." },
    { q: "What currencies are supported?", a: "The platform operates in EUR. Stripe handles currency conversion automatically." },
  ],
  "I was charged incorrectly": [
    { q: "Check your transaction history", a: "Go to Wallet → Transaction History to see all charges. Each order charge is listed with the order ID." },
    { q: "Platform fee", a: "The platform charges a small service fee on top of the expert's price. This is shown before you confirm payment." },
  ],
  "I need a refund": [
    { q: "When am I eligible for a refund?", a: "Refunds are available if the expert didn't deliver within the agreed time or if a dispute is resolved in your favour." },
    { q: "How long does a refund take?", a: "Approved refunds are credited to your wallet within 24 hours. Contact live support if it's been longer." },
  ],
  "My expert didn't deliver": [
    { q: "Has the deadline passed?", a: "If the deadline has passed, you can request a refund from the order page by clicking 'Open Dispute'." },
    { q: "Did you try messaging the expert?", a: "Sometimes there are delays. Message the expert directly in the order chat first." },
  ],
  "I want to cancel my order": [
    { q: "Can I cancel after accepting a quote?", a: "You can cancel before the expert starts working. Go to your active order and click 'Cancel Order'. Funds return to your wallet." },
    { q: "What if the expert already started?", a: "If work has begun, cancellation is subject to admin review. Open a dispute from the order page." },
  ],
  "The delivery was late": [
    { q: "What counts as late delivery?", a: "If the expert exceeds the agreed deadline set in the quote, you can open a dispute from the order page." },
    { q: "How do I get compensated?", a: "Open a dispute and describe the late delivery. Admins may offer a partial or full refund depending on the situation." },
  ],
  "I need to open a dispute": [
    { q: "How do I open a dispute?", a: "Go to your active order page and click 'Open Dispute' at the bottom. Describe the issue clearly." },
    { q: "What happens after I open a dispute?", a: "An admin will review your case within 24 hours. Funds remain in escrow during the review." },
  ],
  "I can't log in to my account": [
    { q: "Try resetting your password", a: "Click 'Forgot password' on the login page and check your email for a reset link." },
    { q: "Check your email for verification", a: "New accounts require email verification. Check your spam folder." },
  ],
  "I want to change my email": [
    { q: "How do I update my email?", a: "Go to Settings → Account and update your email address. A confirmation link will be sent to both the old and new address." },
  ],
  "My account was banned": [
    { q: "Why was my account banned?", a: "Accounts are banned for violations of our Terms of Service, such as fraud, chargebacks, or abusive behaviour." },
    { q: "Can I appeal a ban?", a: "Yes. Contact live support with your account email and a description of the situation. Appeals are reviewed within 48 hours." },
  ],
  "I want to delete my account": [
    { q: "How do I delete my account?", a: "Contact live support and request account deletion. All your data will be removed within 30 days in compliance with GDPR." },
  ],
  "I can't find a good expert": [
    { q: "Use search filters", a: "On the Search page you can filter by category, rating, price and availability to find the best expert for your needs." },
    { q: "Post a request", a: "Instead of searching, post a request and let experts come to you with quotes. This often gets faster results." },
  ],
  "An expert is behaving badly": [
    { q: "How do I report an expert?", a: "Go to the expert's profile or your order page and click 'Report'. Describe the issue in detail." },
    { q: "What happens after I report?", a: "Admins review all reports within 24 hours. If the behaviour violates our policies, action will be taken." },
  ],
  "I want to report an expert": [
    { q: "How do I report?", a: "Visit the expert's profile and click 'Report'. You can also report directly from an active order." },
    { q: "Will the expert know I reported them?", a: "No. Reports are anonymous. The expert will not be notified of who filed the report." },
  ],

  // ── Expert FAQs ──
  "My withdrawal wasn't processed": [
    { q: "How do payouts work?", a: "Earnings are transferred directly to your bank account via Stripe Connect. Set up your Stripe account in Wallet → Payouts." },
    { q: "Is your Stripe account fully set up?", a: "Go to Wallet → Payouts and check your Stripe connection status. You may need to complete onboarding." },
    { q: "When do payouts arrive?", a: "Stripe typically transfers funds to your bank within 2-7 business days after the transfer is initiated." },
  ],
  "I haven't received payment": [
    { q: "Is the order marked as completed?", a: "Payment is released once the buyer marks the order as complete. If they're unresponsive past the deadline, open a dispute." },
    { q: "Check your transaction history", a: "Go to Wallet to see your current balance and transaction history. Earnings appear as 'Session Earning' entries." },
  ],
  "I have a tax question": [
    { q: "Does the platform provide tax documents?", a: "Currently the platform does not issue tax documents. You are responsible for declaring your earnings as per your local tax laws." },
    { q: "What's the platform fee?", a: "The platform retains a percentage of each order as a service fee. The exact rate is displayed when you submit a quote." },
  ],
  "I want to set up Stripe payouts": [
    { q: "How do I connect Stripe?", a: "Go to Wallet → Payouts and click 'Connect with Stripe'. You'll be guided through Stripe's onboarding to link your bank account." },
    { q: "What if I already have a Stripe account?", a: "You can use your existing Stripe account. The onboarding process will connect it to Druxio for receiving payouts." },
  ],
  "I can't access my active order": [
    { q: "Check your Inbox or Dashboard", a: "Active orders are accessible from your Expert Dashboard under 'Active Orders', or directly from the Inbox." },
    { q: "The order link isn't working", a: "Try refreshing the page or clearing your browser cache. If the issue persists, contact live support with the order ID." },
  ],
  "The buyer is unresponsive": [
    { q: "How long should I wait?", a: "If the buyer has not responded within 24 hours of your delivery, you can request admin review to complete the order." },
    { q: "Can I cancel if they don't respond?", a: "Yes. Contact live support and an admin can force-complete or cancel the order depending on the circumstances." },
  ],
  "I need more time to deliver": [
    { q: "How do I request an extension?", a: "Message the buyer directly and ask for more time. If they agree, note it in the chat. There is no formal extension system yet." },
    { q: "What if I miss the deadline?", a: "If you miss the deadline, the buyer can open a dispute. Communicate proactively to avoid this." },
  ],
  "I want to cancel an order": [
    { q: "Can I cancel an accepted order?", a: "Cancellations after accepting a quote require admin approval. Contact live support and explain the reason." },
    { q: "Will it affect my rating?", a: "Cancellations may negatively impact your seller metrics. Frequent cancellations can lead to account restrictions." },
  ],
  "I can't log in": [
    { q: "Try resetting your password", a: "Click 'Forgot password' on the login page and check your email for a reset link." },
    { q: "Check your email for verification", a: "New accounts require email verification. Check your spam folder too." },
  ],
  "I want to update my skills": [
    { q: "How do I edit my skills?", a: "Go to Settings → Profile and update your skills list. Changes are reflected on your public profile immediately." },
    { q: "How many skills can I add?", a: "You can add as many skills as relevant. We recommend keeping the list focused and accurate for better job matches." },
  ],
  "My account is restricted": [
    { q: "Why is my account restricted?", a: "Restrictions are applied for policy violations, low ratings, or suspicious activity. Check your email for a notice." },
    { q: "How do I appeal?", a: "Contact live support and provide your account email. Appeals are reviewed within 48 hours." },
  ],
  "I want to become verified": [
    { q: "What does verification involve?", a: "Verification confirms your identity and expertise. Contact live support to start the process." },
    { q: "What are the benefits?", a: "Verified experts receive a badge on their profile, higher visibility in search, and increased buyer trust." },
  ],
  "I got a warning — why?": [
    { q: "How do I find out the reason?", a: "You should have received an email with details. If not, contact live support with your account email." },
    { q: "Can I appeal a warning?", a: "Yes. Reach out via live support with your account details and an explanation. Warnings are reviewed case by case." },
  ],
  "What are the platform fees?": [
    { q: "How much does the platform charge?", a: "The platform charges a service fee on each completed order. The exact percentage is shown when you submit a quote." },
    { q: "Are there any other fees?", a: "Withdrawal fees depend on the method chosen. PayPal and crypto networks may charge their own network fees." },
  ],
  "What is allowed in orders?": [
    { q: "What services can I offer?", a: "You can offer any digital service that complies with our Terms of Service: tutoring, consulting, gaming help, tech support, and more." },
    { q: "What is not allowed?", a: "Anything illegal, misleading, adult content, or that violates third-party terms (e.g. game anti-cheat policies) is strictly prohibited." },
  ],
};

const DEFAULT_FAQ = [
  { q: "How does the platform work?", a: "Post a request, receive quotes from experts, accept one, and the work begins. Funds are held in escrow until you're satisfied." },
  { q: "Is my payment secure?", a: "Yes. All funds are held in escrow and only released when you confirm the work is complete." },
  { q: "How long does delivery take?", a: "Delivery times are set by experts when they quote. Most orders are completed within minutes to hours." },
];

// ─── Types ─────────────────────────────────────────────────────────────────

type Step = "bubble" | "role" | "category" | "problem" | "faq" | "live";

interface SupportMessage {
  id: string;
  content: string;
  sender_type: "user" | "admin" | "bot";
  created_at: string;
  sender_id: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SupportWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"client" | "expert" | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [faqIndex, setFaqIndex] = useState(0);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [unread, setUnread] = useState(0);
  const [user, setUser] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Realtime messages
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`support-${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const msg = payload.new as SupportMessage;
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (!open && msg.sender_type === "admin") setUnread(u => u + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, open]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear unread on open
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const reset = () => {
    setStep("role");
    setRole(null);
    setCategory(null);
    setProblem(null);
    setFaqIndex(0);
    setTicketId(null);
    setMessages([]);
    setMsgInput("");
  };

  const faqItems: { q: string; a: string }[] | null = problem
    ? (FAQ[problem] ?? null)
    : DEFAULT_FAQ;

  const hasFaq = faqItems && faqItems.length > 0;

  const handleRequestLive = async () => {
    if (!user || !role || !category || !problem) return;
    setCreatingTicket(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          role_type: role,
          category,
          problem,
          status: "waiting",
        })
        .select()
        .single();
      if (error) throw error;

      setTicketId(ticket.id);

      // Insert bot intro message
      await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_type: "bot",
        content: `Hi! You're now connected to live support. An admin will be with you shortly.\n\n**Your issue:** ${problem}\n**Category:** ${category}`,
      });

      const { data: msgs } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at");
      setMessages((msgs || []).map(m => ({ ...m, sender_type: m.sender_type as "user" | "admin" | "bot" })));
      setStep("live");
    } catch (e: any) {
      console.error(e);
    }
    setCreatingTicket(false);
  };

  const sendMessage = async () => {
    if (!msgInput.trim() || !ticketId || !user || sending) return;
    setSending(true);
    const content = msgInput.trim();
    setMsgInput("");

    // Update ticket status to live if waiting
    await supabase
      .from("support_tickets")
      .update({ status: "live" })
      .eq("id", ticketId)
      .eq("status", "waiting");

    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_id: user.id,
      sender_type: "user",
      content,
    });
    setSending(false);
  };

  const categories = role ? Object.keys(FLOW[role]) : [];
  const problems = role && category ? FLOW[role][category] : [];

  // ─── Render ─────────────────────────────────────────────────────

  // Hide on inbox — the full-page chat UI makes the widget redundant
  if (location.pathname === "/inbox") return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {open && (
        <div
          className="w-[340px] sm:w-[380px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="bg-primary px-4 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              {step !== "role" && step !== "live" && (
                <button
                  onClick={() => {
                    if (step === "category") setStep("role");
                    else if (step === "problem") setStep("category");
                    else if (step === "faq") { setStep("problem"); setFaqIndex(0); }
                  }}
                  className="text-primary-foreground/70 hover:text-primary-foreground transition-colors p-1 -ml-1 rounded-lg hover:bg-primary-foreground/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <Headphones className="h-4.5 w-4.5 text-primary-foreground" />
              <span className="text-sm font-bold text-primary-foreground tracking-wide">Support</span>
              {step === "live" && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 ml-1 animate-in fade-in duration-300">
                  Live
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {(step === "faq" || step === "live") && (
                <button onClick={reset} className="text-primary-foreground/60 hover:text-primary-foreground transition-colors px-2 py-1 rounded-lg text-xs hover:bg-primary-foreground/10">
                  Restart
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-primary-foreground/60 hover:text-primary-foreground transition-colors p-1.5 rounded-lg hover:bg-primary-foreground/10">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            {/* ── STEP: Role ── */}
            {step === "role" && (
              <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-foreground">How can we help?</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6 ml-[42px]">Tell us who you are to get started.</p>
                <div className="grid grid-cols-2 gap-3 mt-auto mb-auto">
                  {[
                    { key: "client" as const, icon: User, label: "I'm a Client", sub: "I buy services", delay: "100ms" },
                    { key: "expert" as const, icon: Briefcase, label: "I'm an Expert", sub: "I sell services", delay: "200ms" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setRole(opt.key); setStep("category"); }}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/[0.06] transition-all duration-200 group hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: opt.delay, animationFillMode: "both" }}
                    >
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-200">
                        <opt.icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{opt.label}</span>
                      <span className="text-[11px] text-muted-foreground text-center leading-tight">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP: Category ── */}
            {step === "category" && (
              <div className="h-full flex flex-col p-5 animate-in fade-in slide-in-from-right-3 duration-300">
                <p className="text-sm font-bold text-foreground mb-1">What's the topic?</p>
                <p className="text-xs text-muted-foreground mb-4">Select the area that best describes your issue.</p>
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {categories.map((cat, i) => (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); setStep("problem"); }}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/[0.04] transition-all duration-200 text-left group hover:shadow-sm active:scale-[0.98] animate-in fade-in slide-in-from-bottom-1"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                    >
                      <span className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">{cat}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP: Problem ── */}
            {step === "problem" && (
              <div className="h-full flex flex-col p-5 animate-in fade-in slide-in-from-right-3 duration-300">
                <p className="text-sm font-bold text-foreground mb-1">What's the problem?</p>
                <p className="text-xs text-muted-foreground mb-4">Choose the option that best describes your situation.</p>
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {problems.map((prob, i) => (
                    <button
                      key={prob}
                      onClick={() => { setProblem(prob); setStep("faq"); setFaqIndex(0); }}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/[0.04] transition-all duration-200 text-left group hover:shadow-sm active:scale-[0.98] animate-in fade-in slide-in-from-bottom-1"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                    >
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{prob}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP: FAQ ── */}
            {step === "faq" && (
              <div className="h-full flex flex-col p-5 animate-in fade-in slide-in-from-right-3 duration-300">
                {hasFaq ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      We found some answers that might help:
                    </p>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                      {faqItems!.map((item, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-border bg-background p-4 hover:border-primary/20 transition-all duration-200 animate-in fade-in slide-in-from-bottom-1"
                          style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                        >
                          <p className="text-xs font-bold text-foreground mb-1.5">{item.q}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-border mt-3 shrink-0 animate-in fade-in duration-500" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
                      <p className="text-xs text-muted-foreground mb-2.5 text-center">Still need help?</p>
                      {!user ? (
                        <p className="text-xs text-center text-muted-foreground">
                          <a href="/auth" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">Sign in</a> to chat with live support.
                        </p>
                      ) : (
                        <Button
                          className="w-full gap-2 transition-all duration-200 hover:shadow-glow active:scale-[0.98]"
                          size="sm"
                          onClick={handleRequestLive}
                          disabled={creatingTicket}
                        >
                          {creatingTicket ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Headphones className="h-3.5 w-3.5" />}
                          Talk to a human
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  /* No FAQ found — go straight to live support */
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-2 animate-in fade-in zoom-in-95 duration-300">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Headphones className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground mb-1">We couldn't find a quick answer</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This issue needs a human touch. Connect with our support team and we'll sort it out right away.
                      </p>
                    </div>
                    {!user ? (
                      <p className="text-xs text-muted-foreground">
                        <a href="/auth" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">Sign in</a> to chat with live support.
                      </p>
                    ) : (
                      <Button
                        className="w-full gap-2 transition-all duration-200 hover:shadow-glow active:scale-[0.98]"
                        onClick={handleRequestLive}
                        disabled={creatingTicket}
                      >
                        {creatingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Headphones className="h-4 w-4" />}
                        Talk to a human
                      </Button>
                    )}
                    <button
                      onClick={() => setStep("problem")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      ← Go back and pick a different problem
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP: Live Chat ── */}
            {step === "live" && (
              <div className="h-full flex flex-col animate-in fade-in duration-300">
                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-3">
                    {messages.map((msg, i) => {
                      const isUser = msg.sender_type === "user";
                      const isBot = msg.sender_type === "bot";
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-2 animate-in fade-in duration-200",
                            isUser ? "flex-row-reverse slide-in-from-right-2" : "flex-row slide-in-from-left-2"
                          )}
                          style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
                        >
                          {!isUser && (
                            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                              <AvatarFallback className={cn("text-[10px] font-bold", isBot ? "bg-primary/10 text-primary" : "bg-muted text-foreground")}>
                                {isBot ? <Bot className="h-3.5 w-3.5" /> : "A"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap",
                            isUser
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : isBot
                                ? "bg-muted/60 text-foreground rounded-tl-sm border border-border/50"
                                : "bg-secondary text-secondary-foreground rounded-tl-sm"
                          )}>
                            {!isUser && !isBot && (
                              <p className="text-[10px] font-bold text-muted-foreground mb-0.5">Support Admin</p>
                            )}
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
                <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      className="h-9 text-sm rounded-xl"
                      disabled={sending}
                    />
                    <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl transition-all duration-200 active:scale-90" onClick={sendMessage} disabled={sending || !msgInput.trim()}>
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          "bg-primary hover:bg-primary/90 active:scale-90 hover:shadow-glow",
          open ? "rotate-0" : "hover:scale-105"
        )}
        aria-label="Support"
      >
        <span className={cn(
          "absolute inset-0 rounded-full transition-all duration-300",
          open ? "opacity-0 scale-0" : "opacity-100 scale-100"
        )}>
          <MessageCircle className="h-6 w-6 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </span>
        <span className={cn(
          "absolute inset-0 rounded-full transition-all duration-300",
          open ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-0 rotate-90"
        )}>
          <X className="h-6 w-6 text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </span>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in duration-200">
            {unread}
          </span>
        )}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping pointer-events-none" style={{ animationDuration: "3s" }} />
        )}
      </button>
    </div>
  );
}
