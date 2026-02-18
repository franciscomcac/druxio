import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Star, CheckCircle2, ChevronRight, ChevronLeft, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

type Step = "rating" | "category" | "message" | "done";

const USER_TYPES = ["Client", "Expert", "Just browsing"] as const;
type UserType = (typeof USER_TYPES)[number];

const CATEGORIES = [
  { label: "Posting a request", value: "posting_request" },
  { label: "Finding an expert", value: "finding_expert" },
  { label: "Payments & wallet", value: "payments" },
  { label: "Mobile experience", value: "mobile" },
  { label: "Expert tools", value: "expert_tools" },
  { label: "Search & filters", value: "search" },
  { label: "Inbox & chat", value: "inbox" },
  { label: "Other", value: "other" },
] as const;

// Pre-filled suggestion chips per category
const SUGGESTIONS: Record<string, string[]> = {
  posting_request: [
    "Let me edit my request after posting",
    "Show estimated wait time before I post",
    "Better AI suggestions for my description",
  ],
  finding_expert: [
    "Add sort by rating / price / sessions",
    "Show expert response time on cards",
    "Filter by availability / timezone",
  ],
  payments: [
    "Show balance history as a chart",
    "Faster withdrawal processing",
    "More withdrawal methods (crypto, bank)",
  ],
  mobile: [
    "Add bottom navigation bar on mobile",
    "Support widget overlaps content on mobile",
    "Improve mobile search & filter UX",
  ],
  expert_tools: [
    "Show earnings summary on dashboard",
    "Earnings chart over time",
    "Easier rate / availability setup",
  ],
  search: [
    "Sort experts by price / rating",
    "Better empty-state when no results found",
    "Show expert availability in search",
  ],
  inbox: [
    "Show unread message badge count",
    "Let me archive old sessions",
    "Better mobile chat layout",
  ],
  other: [
    "Browse experts without posting",
    "Real testimonials from actual users",
    "Faster page loading",
  ],
};

// ─── Star component ──────────────────────────────────────────────

const StarRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="p-1 rounded transition-transform hover:scale-110 focus:outline-none"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        >
          <Star
            className={cn(
              "h-8 w-8 transition-colors",
              n <= (hovered || value)
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
};

// ─── Main widget ─────────────────────────────────────────────────

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("rating");
  const [rating, setRating] = useState(0);
  const [userType, setUserType] = useState<UserType | "">("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const reset = () => {
    setStep("rating");
    setRating(0);
    setUserType("");
    setCategory("");
    setMessage("");
    setEmail("");
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  const canGoNext = () => {
    if (step === "rating") return rating > 0;
    if (step === "category") return !!category;
    if (step === "message") return message.trim().length > 0;
    return false;
  };

  const next = async () => {
    if (step === "rating") return setStep("category");
    if (step === "category") return setStep("message");
    if (step === "message") {
      setSubmitting(true);
      try {
        await supabase.from("feedback").insert({
          user_id: userId,
          rating,
          category,
          message: message.trim(),
          user_type: userType || null,
          email: email.trim() || null,
        });
        setStep("done");
      } catch {
        // ignore - still show done
        setStep("done");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const back = () => {
    if (step === "category") setStep("rating");
    if (step === "message") setStep("category");
  };

  const suggestions = SUGGESTIONS[category] || [];

  const ratingLabel = ["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating] || "";

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 left-6 z-40">
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          variant="outline"
          className="rounded-full shadow-lg gap-2 bg-background border-border hover:bg-accent text-foreground pr-4"
        >
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Feedback</span>
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquarePlus className="h-4 w-4 text-primary" />
                </div>
                <DialogTitle className="text-base">Share your feedback</DialogTitle>
              </div>
              {/* Step indicator */}
              {step !== "done" && (
                <div className="flex items-center gap-1.5">
                  {(["rating", "category", "message"] as Step[]).map((s, i) => (
                    <div
                      key={s}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        step === s
                          ? "w-6 bg-primary"
                          : i < ["rating", "category", "message"].indexOf(step)
                          ? "w-3 bg-primary/50"
                          : "w-3 bg-muted"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="px-6 py-6 min-h-[280px] flex flex-col">
            {/* Step 1: Rating + user type */}
            {step === "rating" && (
              <div className="flex flex-col gap-6 flex-1">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">How's your experience so far?</p>
                  <p className="text-xs text-muted-foreground mb-4">We read every piece of feedback.</p>
                  <StarRating value={rating} onChange={setRating} />
                  {ratingLabel && (
                    <p className="text-sm text-muted-foreground mt-2 transition-all">{ratingLabel}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">I am a…</p>
                  <div className="flex flex-wrap gap-2">
                    {USER_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setUserType(t)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-sm transition-colors",
                          userType === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Category */}
            {step === "category" && (
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">What area is your feedback about?</p>
                  <p className="text-xs text-muted-foreground mb-4">Pick the most relevant topic.</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-sm transition-colors",
                          category === c.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Message + email */}
            {step === "message" && (
              <div className="flex flex-col gap-4 flex-1">
                {suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Quick suggestions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setMessage(s)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full border transition-colors",
                            message === s
                              ? "bg-primary/10 border-primary text-primary"
                              : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Textarea
                  placeholder="Tell us more — what would make things better?"
                  className="resize-none text-sm min-h-[100px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                />
                <Input
                  type="email"
                  placeholder="Email (optional — for follow-up)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {/* Done screen */}
            {step === "done" && (
              <div className="flex flex-col items-center justify-center flex-1 text-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">Thanks for the feedback!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Every submission is read by our team and shapes what we build next.
                  </p>
                </div>
                <Button onClick={handleClose} variant="outline" size="sm" className="mt-2">
                  Close
                </Button>
              </div>
            )}
          </div>

          {/* Footer nav */}
          {step !== "done" && (
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              {step !== "rating" ? (
                <Button variant="ghost" size="sm" onClick={back} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}
              <Button
                size="sm"
                onClick={next}
                disabled={!canGoNext() || submitting}
                className="gap-1.5 min-w-[100px]"
              >
                {submitting ? (
                  "Sending…"
                ) : step === "message" ? (
                  "Submit"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
