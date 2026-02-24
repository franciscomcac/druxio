import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import RankBadge from "@/components/RankBadge";
import {
  Zap, DollarSign, Star, Target, Plus, ArrowRight, ChevronRight,
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

const statusColor: Record<string, string> = {
  open: "bg-primary/10 text-primary border-primary/20",
  accepted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const ClientDashboard = ({ profile, myJobs, onJobsChanged }: ClientDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Map of job_id -> accepted quote price
  const [quotePrices, setQuotePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const jobsWithQuote = myJobs.filter(j => j.status === "accepted" || j.status === "completed" || j.status === "disputed");
    if (jobsWithQuote.length === 0) return;

    const fetchPrices = async () => {
      const results = await Promise.all(
        jobsWithQuote.map(job =>
          supabase.from("quotes").select("price").eq("job_id", job.id).eq("status", "accepted").maybeSingle()
        )
      );
      const map: Record<string, number> = {};
      results.forEach((res, i) => {
        if (res.data?.price != null) map[jobsWithQuote[i].id] = Number(res.data.price);
      });
      setQuotePrices(map);
    };
    fetchPrices();
  }, [myJobs]);

  const statCards = [
    { icon: <DollarSign className="h-5 w-5" />, value: `€${profile?.wallet_balance?.toFixed(2) || "0.00"}`, label: "Wallet" },
    { icon: <Target className="h-5 w-5" />, value: myJobs.filter(j => j.status === "completed").length, label: "Completed" },
    { icon: <Zap className="h-5 w-5" />, value: myJobs.filter(j => j.status === "open").length, label: "Active" },
    { icon: <Star className="h-5 w-5" />, value: myJobs.length, label: "Total" },
  ];

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <Card
            key={i}
            className="border-border bg-card/60 backdrop-blur-xl transition-all duration-300 hover:shadow-glow hover:-translate-y-0.5 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary/[0.08] text-primary shrink-0">
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Job list — full width on mobile */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:200ms]">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base sm:text-lg">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Your Requests
                </span>
                <Button
                  size="sm"
                  className="gap-1 shadow-glow hover:shadow-glow-lg transition-shadow h-8 px-3 text-xs"
                  onClick={() => navigate("/post-request")}
                >
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4">
              {myJobs.length > 0 ? (
                <div className="space-y-2">
                  {myJobs.slice(0, 10).map((job, i) => (
                    <button
                      key={job.id}
                      className="w-full text-left flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-3 sm:px-4 sm:py-4 transition-all duration-200 hover:border-primary/20 hover:bg-primary/[0.03] active:scale-[0.99] animate-fade-in"
                      style={{ animationDelay: `${(i + 3) * 50}ms` }}
                      onClick={() => {
                        if (job.status === "open") navigate(`/request/${job.id}`);
                        else if (job.status === "accepted" || job.status === "completed" || job.status === "disputed") navigate(`/order/${job.id}`);
                      }}
                    >
                      {/* Status dot */}
                      <span className={`shrink-0 h-2 w-2 rounded-full ${job.status === "open" ? "bg-primary" : job.status === "accepted" ? "bg-amber-400" : "bg-emerald-400"}`} />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm leading-snug line-clamp-1">{job.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-primary/80 font-medium">{job.category}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs font-semibold text-foreground">
                            {quotePrices[job.id] != null ? `€${quotePrices[job.id]}` : `up to €${job.budget_max}`}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">· {timeAgo(job.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor[job.status] || "bg-muted text-muted-foreground border-border"}`}>
                          {job.status}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/[0.06] flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary/40" />
                  </div>
                  <p className="font-medium text-foreground mb-1 text-sm">No requests yet</p>
                  <p className="text-xs mb-4">Post your first request and get expert quotes in seconds</p>
                  <Button size="sm" className="gap-2" onClick={() => navigate("/post-request")}>
                    <Plus className="h-3.5 w-3.5" /> Post a Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — stacks below on mobile */}
        <div className="space-y-4">
          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:300ms]">
            <CardHeader className="pb-2"><CardTitle className="text-base">Client Rank</CardTitle></CardHeader>
            <CardContent>
              <RankBadge totalSpent={profile?.total_spent || 0} showProgress size="md" />
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 backdrop-blur-xl animate-slide-up [animation-delay:400ms]">
            <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              <Button className="w-full justify-between shadow-glow hover:shadow-glow-lg transition-shadow h-10" onClick={() => navigate("/post-request")}>
                Post a Task <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-border hover:bg-primary/[0.06] hover:border-primary/20 h-10" onClick={() => navigate("/wallet")}>
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
