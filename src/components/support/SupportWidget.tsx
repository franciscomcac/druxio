import { useState, useEffect, useRef } from "react";
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
      "I want to set up PayPal",
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
  "My payment didn't go through": [
    { q: "Did you check your card details?", a: "Please verify your card number, expiry and CVV are entered correctly." },
    { q: "Is your card 3D-Secure enabled?", a: "Some payments require 3D-Secure verification from your bank. Check your banking app for a pending confirmation." },
    { q: "Try a different payment method", a: "You can also top up via PayPal or crypto from the Wallet page. If it still fails, contact live support below." },
  ],
  "I want to add funds to my wallet": [
    { q: "How do I top up?", a: "Go to the Wallet page and click 'Add Funds'. You can pay via PayPal or crypto." },
    { q: "What currencies are supported?", a: "The platform operates in EUR. PayPal converts automatically." },
  ],
  "My withdrawal wasn't processed": [
    { q: "What's the processing time?", a: "Withdrawals are reviewed within 24 hours. PayPal arrives in 1-3 days, crypto in 30-60 minutes after approval." },
    { q: "Is your wallet address correct?", a: "Double-check your PayPal email or crypto wallet address in Settings." },
    { q: "Minimum withdrawal amount", a: "The minimum withdrawal is €5.00. Check that your balance meets this threshold." },
  ],
  "I need to open a dispute": [
    { q: "How do I open a dispute?", a: "Go to your active order page and click 'Open Dispute' at the bottom. Describe the issue clearly." },
    { q: "What happens after I open a dispute?", a: "An admin will review your case within 24 hours. Funds remain in escrow during the review." },
  ],
  "My expert didn't deliver": [
    { q: "Has the deadline passed?", a: "If the deadline has passed, you can request a refund from the order page by clicking 'Open Dispute'." },
    { q: "Did you try messaging the expert?", a: "Sometimes there are delays. Message the expert directly in the order chat first." },
  ],
  "I can't log in to my account": [
    { q: "Try resetting your password", a: "Click 'Forgot password' on the login page and check your email for a reset link." },
    { q: "Check your email for verification", a: "New accounts require email verification. Check your spam folder." },
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

  const faqItems = problem
    ? (FAQ[problem] || DEFAULT_FAQ)
    : DEFAULT_FAQ;

  const currentFaq = faqItems[faqIndex];

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

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {open && (
        <div className="w-[340px] sm:w-[380px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "520px" }}>
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {step !== "role" && step !== "live" && (
                <button
                  onClick={() => {
                    if (step === "category") setStep("role");
                    else if (step === "problem") setStep("category");
                    else if (step === "faq") { setStep("problem"); setFaqIndex(0); }
                  }}
                  className="text-primary-foreground/70 hover:text-primary-foreground transition-colors p-1 -ml-1 rounded"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <Headphones className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm font-semibold text-primary-foreground">Support</span>
              {step === "live" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                  Live
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(step === "faq" || step === "live") && (
                <button onClick={reset} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors p-1 rounded text-xs">
                  Restart
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors p-1 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            {/* ── STEP: Role ── */}
            {step === "role" && (
              <div className="h-full flex flex-col p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">How can we help?</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">Tell us who you are to get started.</p>
                <div className="grid grid-cols-2 gap-3 mt-auto mb-auto">
                  <button
                    onClick={() => { setRole("client"); setStep("category"); }}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">I'm a Client</span>
                    <span className="text-[11px] text-muted-foreground text-center">I buy services</span>
                  </button>
                  <button
                    onClick={() => { setRole("expert"); setStep("category"); }}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">I'm an Expert</span>
                    <span className="text-[11px] text-muted-foreground text-center">I sell services</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: Category ── */}
            {step === "category" && (
              <div className="h-full flex flex-col p-5">
                <p className="text-sm font-semibold text-foreground mb-1">What's the topic?</p>
                <p className="text-xs text-muted-foreground mb-4">Select the area that best describes your issue.</p>
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); setStep("problem"); }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                    >
                      <span className="text-sm text-foreground font-medium">{cat}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP: Problem ── */}
            {step === "problem" && (
              <div className="h-full flex flex-col p-5">
                <p className="text-sm font-semibold text-foreground mb-1">What's the problem?</p>
                <p className="text-xs text-muted-foreground mb-4">Choose the option that best describes your situation.</p>
                <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                  {problems.map((prob) => (
                    <button
                      key={prob}
                      onClick={() => { setProblem(prob); setStep("faq"); setFaqIndex(0); }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                    >
                      <span className="text-sm text-foreground">{prob}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP: FAQ ── */}
            {step === "faq" && (
              <div className="h-full flex flex-col p-5">
                <p className="text-xs text-muted-foreground mb-3">
                  We found some answers that might help:
                </p>
                <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                  {faqItems.map((item, i) => (
                    <div key={i} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-xs font-semibold text-foreground mb-1">{item.q}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-border mt-3 shrink-0">
                  <p className="text-xs text-muted-foreground mb-2 text-center">Still need help?</p>
                  {!user ? (
                    <p className="text-xs text-center text-muted-foreground">
                      <a href="/auth" className="text-primary underline">Sign in</a> to chat with live support.
                    </p>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      size="sm"
                      onClick={handleRequestLive}
                      disabled={creatingTicket}
                    >
                      {creatingTicket ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Headphones className="h-3.5 w-3.5" />}
                      Talk to a human
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP: Live Chat ── */}
            {step === "live" && (
              <div className="h-full flex flex-col">
                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isUser = msg.sender_type === "user";
                      const isBot = msg.sender_type === "bot";
                      return (
                        <div key={msg.id} className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
                          {!isUser && (
                            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                              <AvatarFallback className={cn("text-[10px] font-bold", isBot ? "bg-primary/10 text-primary" : "bg-muted text-foreground")}>
                                {isBot ? <Bot className="h-3.5 w-3.5" /> : "A"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                            isUser
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : isBot
                                ? "bg-muted/60 text-foreground rounded-tl-sm border border-border/50"
                                : "bg-secondary text-secondary-foreground rounded-tl-sm"
                          )}>
                            {!isUser && !isBot && (
                              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Support Admin</p>
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
                      className="h-9 text-sm"
                      disabled={sending}
                    />
                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage} disabled={sending || !msgInput.trim()}>
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
          "relative h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          "bg-primary hover:bg-primary/90 active:scale-95",
          open && "rotate-0"
        )}
        aria-label="Support"
      >
        {open
          ? <X className="h-6 w-6 text-primary-foreground" />
          : <MessageCircle className="h-6 w-6 text-primary-foreground" />
        }
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
