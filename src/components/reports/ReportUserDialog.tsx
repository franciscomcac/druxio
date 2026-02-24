import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";

const REPORT_REASONS = [
  { value: "scam", label: "Scam or fraud" },
  { value: "inappropriate", label: "Inappropriate content or behavior" },
  { value: "impersonation", label: "Impersonation" },
  { value: "spam", label: "Spam or misleading info" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "fake_reviews", label: "Fake reviews" },
  { value: "non_delivery", label: "Consistently not delivering" },
  { value: "other", label: "Other" },
] as const;

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName: string;
}

const ReportUserDialog = ({
  open,
  onOpenChange,
  reportedUserId,
  reportedUserName,
}: ReportUserDialogProps) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be logged in to report a user.",
          variant: "destructive",
        });
        return;
      }

      if (user.id === reportedUserId) {
        toast({ title: "You cannot report yourself", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("user_reports" as any).insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
        description: description.trim() || null,
      } as any);

      if (error) throw error;

      toast({
        title: "Report submitted",
        description:
          "Thank you for helping keep Duxio safe. Our team will review this report.",
      });

      // Reset & close
      setReason("");
      setDescription("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error submitting report",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Report User
          </DialogTitle>
          <DialogDescription>
            Report <span className="font-medium text-foreground">{reportedUserName}</span> for
            violating our community guidelines. All reports are reviewed by our
            team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="report-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-description">
              Additional details (optional)
            </Label>
            <Textarea
              id="report-description"
              placeholder="Provide any additional context that might help our team review this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              False reports may result in action against your account. Please
              only report genuine violations.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !reason}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportUserDialog;
