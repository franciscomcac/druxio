import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import RankBadge from "@/components/RankBadge";
import {
  Zap, DollarSign, Star, Target, Plus, ArrowRight,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string | null;
  category: string;
  budget_max: number;
  deadline_minutes: number;
  status: string;
  created_at: string;
  expires_at: string | null;
  buyer_id: string;
}

interface ClientDashboardProps {
  profile: any;
  myJobs: Job[];
  onJobsChanged?: () => void;
}

const timeAgo = (date: string) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const ClientDashboard = ({ profile, myJobs, onJobsChanged }: ClientDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const statCards = [
    { icon: <DollarSign className="h-6 w-6" />, value: `€${profile?.wallet_balance?.toFixed(2) || "0.00"}`, label: "Wallet Balance" },
    { icon: <Target className="h-6 w-6" />, value: myJobs.filter(j => j.status === "complete").length, label: "Completed Jobs" },
    { icon: <Zap className="h-6 w-6" />, value: myJobs.filter(j => j.status === "open").length, label: "Active Requests" },
    { icon: <Star className="h-6 w-6" />, value: myJobs.length, label: "Total Requests" },
  ];

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border bg-card/60 backdrop-blur-xl transition-all duration-500 hover:shadow-glow hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:300ms]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Your Requests</span>
                <Button size="sm" className="gap-1.5 shadow-glow hover:shadow-glow-lg transition-shadow" onClick={() => navigate("/post-request")}>
                  <Plus className="h-4 w-4" /> New Request
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myJobs.length > 0 ? (
                <div className="space-y-3">
                  {myJobs.slice(0, 10).map((job, i) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4 transition-all duration-300 hover:border-primary/20 hover:bg-primary/[0.03] animate-fade-in cursor-pointer"
                      style={{ animationDelay: `${(i + 4) * 60}ms` }}
                      onClick={() => {
                        if (job.status === "open") navigate(`/request/${job.id}`);
                        else if (job.status === "accepted") navigate(`/order/${job.id}`);
                      }}
                    >
                      <div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs border-primary/20 text-primary/80">{job.category}</Badge>
                          <span className="font-semibold text-foreground">€{job.budget_max}</span>
                          <span>{timeAgo(job.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={job.status === "open" ? "default" : "secondary"} className={`capitalize ${job.status === "open" ? "shadow-glow" : ""}`}>{job.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/[0.06] flex items-center justify-center">
                    <Zap className="h-7 w-7 text-primary/40" />
                  </div>
                  <p className="font-medium text-foreground mb-1">No requests yet</p>
                  <p className="text-sm mb-4">Post your first request and get expert quotes in seconds</p>
                  <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/[0.06]" onClick={() => navigate("/post-request")}>
                    <Plus className="h-4 w-4" /> Post Your First Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:400ms]">
            <CardHeader><CardTitle className="text-lg">Your Client Rank</CardTitle></CardHeader>
            <CardContent>
              <RankBadge totalSpent={profile?.total_spent || 0} showProgress size="md" />
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:500ms]">
            <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-between shadow-glow hover:shadow-glow-lg transition-shadow" onClick={() => navigate("/post-request")}>
                Post a Request <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-border hover:bg-primary/[0.06] hover:border-primary/20" onClick={() => navigate("/wallet")}>
                Top Up Wallet <DollarSign className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
