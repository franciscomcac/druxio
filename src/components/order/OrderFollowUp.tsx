import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageSquarePlus, ThumbsUp, ThumbsDown } from "lucide-react";
import SimilarExperts from "@/components/experts/SimilarExperts";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrderFollowUpProps {
  jobCategory: string;
  expertId: string;
  expertSkills?: string[];
  sessionId: string | null;
  hasReviewed: boolean;
  onOpenReview: () => void;
}

const OrderFollowUp = ({
  jobCategory,
  expertId,
  expertSkills = [],
  sessionId,
  hasReviewed,
  onOpenReview,
}: OrderFollowUpProps) => {
  const navigate = useNavigate();
  const [satisfaction, setSatisfaction] = useState<"up" | "down" | null>(null);

  const handleSatisfaction = async (vote: "up" | "down") => {
    setSatisfaction(vote);
    if (sessionId) {
      await supabase
        .from("sessions")
        .update({ notes: `satisfaction:${vote}` })
        .eq("id", sessionId);
    }
  };

  const broadCategory = jobCategory.split(":")[0]?.trim();

  return (
    <div className="space-y-4 mt-6">
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">🎉 Order Completed!</h3>

          {/* Satisfaction */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Was this helpful?</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={satisfaction === "up" ? "default" : "outline"}
                className="gap-1 h-8"
                onClick={() => handleSatisfaction("up")}
                disabled={satisfaction !== null}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> Yes
              </Button>
              <Button
                size="sm"
                variant={satisfaction === "down" ? "destructive" : "outline"}
                className="gap-1 h-8"
                onClick={() => handleSatisfaction("down")}
                disabled={satisfaction !== null}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> No
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {!hasReviewed && (
              <Button size="sm" className="gap-1.5" onClick={onOpenReview}>
                <Star className="h-4 w-4" /> Leave a Review
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => navigate(`/post-request?category=${encodeURIComponent(broadCategory)}`)}
            >
              <MessageSquarePlus className="h-4 w-4" /> Need More Help?
            </Button>
          </div>
        </CardContent>
      </Card>

      <SimilarExperts currentExpertId={expertId} skills={expertSkills} />
    </div>
  );
};

export default OrderFollowUp;
