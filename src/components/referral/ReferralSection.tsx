import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Gift, Users, DollarSign } from "lucide-react";

interface ReferralSectionProps {
  userId: string;
}

const ReferralSection = ({ userId }: ReferralSectionProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/?ref=${userId}`;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });
      setReferrals(data || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Link copied! 🔗" });
    setTimeout(() => setCopied(false), 2000);
  };

  const registered = referrals.filter((r) => r.status !== "pending").length;
  const rewarded = referrals.filter((r) => r.status === "rewarded").length;
  const totalEarned = rewarded * 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Invite Friends
        </CardTitle>
        <CardDescription>
          Share your link and earn €2.00 when your friend completes their first order. They get €2.00 too!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Link */}
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="text-sm" />
          <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-chart-2" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-accent/30">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold text-foreground">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">Invited</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/30">
            <Check className="h-5 w-5 mx-auto mb-1 text-chart-2" />
            <p className="text-lg font-bold text-foreground">{registered}</p>
            <p className="text-xs text-muted-foreground">Joined</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/30">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">€{totalEarned.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </div>
        </div>

        {/* Recent referrals */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Recent Referrals</p>
            {referrals.slice(0, 5).map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/20 text-sm">
                <span className="text-muted-foreground">{ref.referred_email || "Pending..."}</span>
                <Badge variant={ref.status === "rewarded" ? "default" : "secondary"} className="text-xs">
                  {ref.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralSection;
