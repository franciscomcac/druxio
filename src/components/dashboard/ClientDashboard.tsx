import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap, DollarSign, Star, Target, Plus, ArrowRight, Loader2,
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
}

const timeAgo = (date: string) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const ClientDashboard = ({ profile, myJobs }: ClientDashboardProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">€{profile?.wallet_balance?.toFixed(2) || "0.00"}</p>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{myJobs.filter(j => j.status === "complete").length}</p>
                <p className="text-sm text-muted-foreground">Completed Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{myJobs.filter(j => j.status === "open").length}</p>
                <p className="text-sm text-muted-foreground">Active Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{myJobs.length}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Your Requests</span>
                <Button size="sm" className="gap-1" onClick={() => navigate("/post-request")}>
                  <Plus className="h-4 w-4" /> New Request
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myJobs.length > 0 ? (
                <div className="space-y-3">
                  {myJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium text-foreground">{job.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{job.category}</Badge>
                          <span>€{job.budget_max}</span>
                          <span>{timeAgo(job.created_at)}</span>
                        </div>
                      </div>
                      <Badge variant={job.status === "open" ? "default" : "secondary"} className="capitalize">{job.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No requests yet</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/post-request")}>
                    <Plus className="h-4 w-4" /> Post Your First Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-between" onClick={() => navigate("/post-request")}>
              Post a Request <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/wallet")}>
              Top Up Wallet <DollarSign className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDashboard;
