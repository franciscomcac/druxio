import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, Clock, Shield, Upload, Loader2, CheckCircle2,
  Hourglass, MessageSquare, Undo2, Scale,
} from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";

interface DisputePanelProps {
  jobId: string;
  userId: string;
  isBuyer: boolean;
  isSeller: boolean;
  sessionId: string | null;
  onResolved?: () => void;
}

interface DisputeData {
  id: string;
  job_id: string;
  raised_by: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  evidence_buyer: string[];
  evidence_seller: string[];
  negotiation_deadline: string;
  escalated_at: string | null;
  resolved_at: string | null;
  resolution_summary: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  negotiation: { label: "Negotiation Period", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: Hourglass },
  escalated: { label: "Escalated to Admin", color: "text-destructive", bg: "bg-destructive/10", icon: Scale },
  resolved_refund: { label: "Resolved — Refunded", color: "text-primary", bg: "bg-primary/10", icon: Undo2 },
  resolved_release: { label: "Resolved — Released", color: "text-chart-3", bg: "bg-chart-3/10", icon: CheckCircle2 },
  resolved_resumed: { label: "Resolved — Resumed", color: "text-chart-2", bg: "bg-chart-2/10", icon: MessageSquare },
};

const DisputePanel = ({ jobId, userId, isBuyer, isSeller, sessionId, onResolved }: DisputePanelProps) => {
  const { toast } = useToast();
  const [dispute, setDispute] = useState<DisputeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState("");
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("disputes" as any)
        .select("*")
        .eq("job_id", jobId)
        .maybeSingle();
      if (data) setDispute(data as any);
      setLoading(false);
    };
    load();

    // Realtime updates
    const channel = supabase
      .channel(`dispute-${jobId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "disputes",
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        if (payload.new) setDispute(payload.new as any);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId]);

  const handleSubmitEvidence = async () => {
    if (!evidence.trim() || !dispute) return;
    setSubmittingEvidence(true);
    try {
      const field = isBuyer ? "evidence_buyer" : "evidence_seller";
      const current = isBuyer ? dispute.evidence_buyer : dispute.evidence_seller;
      const updated = [...(current || []), evidence.trim()];

      await (supabase.from("disputes" as any) as any)
        .update({ [field]: updated, updated_at: new Date().toISOString() })
        .eq("id", dispute.id);

      setDispute(prev => prev ? { ...prev, [field]: updated } : prev);

      // System message in chat
      if (sessionId) {
        await supabase.from("messages").insert({
          session_id: sessionId,
          sender_id: userId,
          content: `🛡️ ADMIN: ${isBuyer ? "Buyer" : "Seller"} submitted evidence for the dispute.`,
        });
      }

      setEvidence("");
      toast({ title: "Evidence submitted ✅" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmittingEvidence(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!dispute) return null;

  const config = statusConfig[dispute.status] || statusConfig.negotiation;
  const StatusIcon = config.icon;
  const isNegotiation = dispute.status === "negotiation";
  const isEscalated = dispute.status === "escalated";
  const isResolved = dispute.status.startsWith("resolved_");
  const deadlinePassed = isPast(new Date(dispute.negotiation_deadline));
  const myEvidence = isBuyer ? dispute.evidence_buyer : dispute.evidence_seller;

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Dispute Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.bg}`}>
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${config.color}`}>{config.label}</p>
            <p className="text-xs text-muted-foreground">
              Raised {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div className="rounded-lg bg-destructive/5 border border-destructive/15 p-3">
          <p className="text-xs font-medium text-destructive mb-1">Reason</p>
          <p className="text-sm text-muted-foreground">{dispute.reason}</p>
        </div>

        {/* Negotiation deadline */}
        {isNegotiation && (
          <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/15 p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs font-medium text-yellow-500">
                  {deadlinePassed ? "Negotiation period expired" : "Negotiation deadline"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deadlinePassed
                    ? "An admin will step in to mediate shortly."
                    : `Expires ${formatDistanceToNow(new Date(dispute.negotiation_deadline), { addSuffix: true })}`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Escalated info */}
        {isEscalated && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/15 p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-xs font-medium text-destructive">Under Admin Review</p>
                <p className="text-xs text-muted-foreground">
                  An admin is reviewing this dispute. Please submit any evidence below within 48 hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resolution summary */}
        {isResolved && dispute.resolution_summary && (
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-primary">Admin Decision</p>
            </div>
            <p className="text-sm text-muted-foreground">{dispute.resolution_summary}</p>
          </div>
        )}

        {/* Evidence section — only during negotiation or escalated */}
        {!isResolved && (
          <>
            {/* My submitted evidence */}
            {myEvidence && myEvidence.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Your Evidence ({myEvidence.length})</p>
                {myEvidence.map((e, i) => (
                  <div key={i} className="rounded-lg bg-muted/30 border border-border p-2.5 text-xs text-muted-foreground">
                    {e}
                  </div>
                ))}
              </div>
            )}

            {/* Submit evidence */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Submit Evidence</p>
              <Textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Describe the issue with details, screenshots links, or any proof..."
                rows={3}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleSubmitEvidence}
                disabled={!evidence.trim() || submittingEvidence}
                className="w-full gap-2"
              >
                {submittingEvidence ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {submittingEvidence ? "Submitting..." : "Submit Evidence"}
              </Button>
            </div>

            {/* Seller can still refund during dispute */}
            {isSeller && (
              <p className="text-xs text-muted-foreground text-center">
                You can still issue a voluntary refund at any time using the "Refund Buyer" button above.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DisputePanel;
