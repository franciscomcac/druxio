import { useState, useRef } from "react";
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
import { AlertTriangle, Loader2, ShieldAlert, ImagePlus, X } from "lucide-react";

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

const MAX_IMAGES = 10;

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
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    if (files.length > remaining) {
      toast({ title: `Max ${MAX_IMAGES} images allowed`, variant: "destructive" });
    }

    const validFiles = toAdd.filter(f => {
      if (!f.type.startsWith("image/")) {
        toast({ title: "Only image files are allowed", variant: "destructive" });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: "Images must be under 5MB", variant: "destructive" });
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setImagePreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (userId: string): Promise<string[]> => {
    if (images.length === 0) return [];
    const urls: string[] = [];
    for (const file of images) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("report-images").upload(path, file);
      if (error) throw error;
      urls.push(path);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in", description: "You need to be logged in to report a user.", variant: "destructive" });
        return;
      }
      if (user.id === reportedUserId) {
        toast({ title: "You cannot report yourself", variant: "destructive" });
        return;
      }

      const imageUrls = await uploadImages(user.id);

      const { error } = await supabase.from("user_reports" as any).insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
        description: description.trim() || null,
        image_urls: imageUrls,
      } as any);

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep Druxio safe. Our team will review this report.",
      });

      setReason("");
      setDescription("");
      setImages([]);
      setImagePreviews([]);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error submitting report", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Report User
          </DialogTitle>
          <DialogDescription>
            Report <span className="font-medium text-foreground">{reportedUserName}</span> for
            violating our community guidelines. All reports are reviewed by our team.
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
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-description">Additional details (optional)</Label>
            <Textarea
              id="report-description"
              placeholder="Provide any additional context that might help our team review this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Evidence (optional, up to {MAX_IMAGES} images)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative group aspect-square rounded-md overflow-hidden border border-border">
                    <img src={src} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < MAX_IMAGES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Add Images ({images.length}/{MAX_IMAGES})
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              False reports may result in action against your account. Please only report genuine violations.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
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
