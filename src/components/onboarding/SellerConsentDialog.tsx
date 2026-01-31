import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  FileCheck,
  DollarSign,
  Clock,
  AlertTriangle,
  Ban,
  Handshake,
  Scale,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface SellerConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => Promise<void>;
}

const SELLER_RULES = [
  {
    icon: FileCheck,
    title: "Quality Standards",
    description:
      "You must deliver high-quality work that matches the job description. All deliverables must meet the buyer's requirements as specified in the job posting.",
  },
  {
    icon: Clock,
    title: "Timely Delivery",
    description:
      "Complete all accepted jobs within the agreed timeframe. If you cannot meet a deadline, communicate with the buyer immediately. Repeated late deliveries may result in account restrictions.",
  },
  {
    icon: DollarSign,
    title: "Escrow & Payments",
    description:
      "Funds are held in escrow until the buyer confirms delivery. The platform takes a 12% fee on completed jobs. Payments are released within 24-48 hours after approval.",
  },
  {
    icon: Shield,
    title: "Proof of Completion",
    description:
      "You must provide clear evidence of completed work (screenshots, recordings, files, etc.). This protects both you and the buyer in case of disputes.",
  },
  {
    icon: Handshake,
    title: "Professional Conduct",
    description:
      "Maintain professional communication at all times. No harassment, discrimination, or inappropriate behavior. Treat all buyers with respect regardless of job size.",
  },
  {
    icon: Scale,
    title: "Fair Bidding",
    description:
      "Submit honest bids that reflect your actual ability to complete the job. Do not underbid to win jobs you cannot deliver on. Accurate pricing builds trust and repeat business.",
  },
  {
    icon: AlertTriangle,
    title: "Dispute Resolution",
    description:
      "In case of disputes, you have 24 hours to respond with evidence. The platform will arbitrate based on the job description and proof provided. Refusal to cooperate may result in automatic refunds.",
  },
  {
    icon: Ban,
    title: "Prohibited Activities",
    description:
      "No account sharing, fake reviews, or manipulation of the rating system. No external payment requests to bypass escrow. No illegal services. Violations result in immediate permanent ban.",
  },
];

const ACKNOWLEDGMENTS = [
  "I understand the 12% platform fee on all completed jobs",
  "I will provide proof of completion for all deliverables",
  "I accept the dispute resolution process and platform decisions",
  "I will not request payments outside of the platform",
  "I will maintain professional conduct with all buyers",
];

const SellerConsentDialog = ({
  open,
  onOpenChange,
  onAccept,
}: SellerConsentDialogProps) => {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(ACKNOWLEDGMENTS.length).fill(false)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allChecked = checkedItems.every(Boolean);

  const handleCheckChange = (index: number, checked: boolean) => {
    const newChecked = [...checkedItems];
    newChecked[index] = checked;
    setCheckedItems(newChecked);
  };

  const handleAccept = async () => {
    if (!allChecked) return;
    setIsSubmitting(true);
    try {
      await onAccept();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCheckedItems(new Array(ACKNOWLEDGMENTS.length).fill(false));
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Become a Seller</DialogTitle>
              <DialogDescription>
                Review and accept our seller guidelines to start offering your
                services
              </DialogDescription>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit">
            Reverse Auction Marketplace
          </Badge>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] px-6">
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-border bg-accent/30 p-4">
              <h4 className="font-semibold text-foreground mb-2">
                How It Works for Sellers
              </h4>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Browse open jobs posted by buyers</li>
                <li>
                  Submit competitive bids (price, timeline, portfolio samples)
                </li>
                <li>If selected, funds are escrowed and work begins</li>
                <li>Upload proof of completion when done</li>
                <li>
                  Get paid after buyer approval (auto-release after 48h if no
                  dispute)
                </li>
              </ol>
            </div>

            <h4 className="font-semibold text-foreground">
              Seller Guidelines & Rules
            </h4>

            <div className="grid gap-3">
              {SELLER_RULES.map((rule, index) => (
                <div
                  key={index}
                  className="flex gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <rule.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground text-sm">
                      {rule.title}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rule.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="border-t border-border p-6 space-y-4">
          <h4 className="font-semibold text-foreground text-sm">
            Please acknowledge the following:
          </h4>
          <div className="space-y-3">
            {ACKNOWLEDGMENTS.map((text, index) => (
              <div key={index} className="flex items-start gap-3">
                <Checkbox
                  id={`ack-${index}`}
                  checked={checkedItems[index]}
                  onCheckedChange={(checked) =>
                    handleCheckChange(index, checked as boolean)
                  }
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor={`ack-${index}`}
                  className="text-sm text-muted-foreground cursor-pointer leading-tight"
                >
                  {text}
                </Label>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!allChecked || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Accept & Become a Seller
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellerConsentDialog;
