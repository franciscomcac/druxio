import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Star, Loader2, Plus, Clock, Users, Zap, ArrowRight,
  Gamepad2, Code, Briefcase, Palette, Music, Dumbbell, Globe, Video,
} from "lucide-react";

const CATEGORY_META: Record<string, { label: string; icon: any; description: string; subcategories: string[] }> = {
  gaming: { label: "Gaming", icon: Gamepad2, description: "Boosting, coaching & game expertise", subcategories: ["Valorant", "Fortnite", "Minecraft", "CS2", "Apex Legends", "League of Legends"] },
  tech: { label: "Tech", icon: Code, description: "Development, bots, servers & SEO", subcategories: ["Discord Bots", "Web Development", "SEO", "Server Setup", "App Development", "WordPress"] },
  business: { label: "Business", icon: Briefcase, description: "Marketing, e-commerce & growth", subcategories: ["Marketing", "Startup Advice", "E-commerce", "Accounting"] },
  creative: { label: "Creative", icon: Palette, description: "Design, video editing & copywriting", subcategories: ["Graphic Design", "Video Editing", "Ad Copy", "Thumbnails"] },
  music: { label: "Music", icon: Music, description: "Production, mixing & lessons", subcategories: ["Production", "Mixing & Mastering", "Guitar Lessons"] },
  fitness: { label: "Fitness", icon: Dumbbell, description: "Training & nutrition plans", subcategories: ["Personal Training", "Nutrition Plans"] },
  languages: { label: "Languages", icon: Globe, description: "Tutoring & translation", subcategories: ["English", "Spanish"] },
  content: { label: "Content", icon: Video, description: "Streaming, YouTube & TikTok", subcategories: ["Streaming", "YouTube", "TikTok"] },
};

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const meta = CATEGORY_META[slug || ""];

  useSEO({
    title: meta ? `${meta.label} Experts` : "Category",
    description: meta ? `Find top ${meta.label} experts on Duxio. ${meta.description}. Get instant quotes and escrow-protected payments.` : undefined,
    canonical: slug ? `/category/${slug}` : undefined,
  });

  const { format } = useCurrency();
  const [experts, setExperts] = useState<any[]>([]);
  const [liveRequestCount, setLiveRequestCount] = useState(0);
  const [recentCompletions, setRecentCompletions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meta) return;
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    setLoading(true);
    const categoryLabel = meta.label;

    // Fetch experts, live requests, and completions in parallel
    const [expertsRes, liveRes, completedRes] = await Promise.all([
      supabase
        .from("expert_categories")
        .select("user_id")
        .ilike("category", `%${categoryLabel}%`)
        .limit(12),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .ilike("category", `%${categoryLabel}%`),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .ilike("category", `%${categoryLabel}%`),
    ]);

    setLiveRequestCount(liveRes.count || 0);
    setRecentCompletions(completedRes.count || 0);

    if (expertsRes.data && expertsRes.data.length > 0) {
      const ids = [...new Set(expertsRes.data.map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids);
      setExperts(profiles || []);
    } else {
      setExperts([]);
    }

    setLoading(false);
  };

  if (!meta) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Category not found</h1>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-background">
      
      <main>
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">{meta.label}</h1>
                <p className="text-muted-foreground">{meta.description}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mt-8">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{liveRequestCount}</span>
                <span className="text-muted-foreground">live requests</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{experts.length}</span>
                <span className="text-muted-foreground">experts available</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{recentCompletions}</span>
                <span className="text-muted-foreground">completed orders</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="gap-2 shadow-glow" onClick={() => navigate(`/post-request?category=${meta.label}`)}>
                <Plus className="h-4 w-4" /> Post a Request
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate(`/search?categories=${meta.label}`)}>
                Browse All Experts <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Online Sellers */}
        {!loading && experts.filter(e => e.is_online).length > 0 && (
          <section className="py-10 border-t border-border/30">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-2 animate-pulse" />
                <h2 className="text-lg font-semibold text-foreground">
                  Online Sellers for {meta.label}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Available right now — estimated response{" "}
                <span className="font-medium text-foreground">
                  ~{Math.min(...experts.filter(e => e.is_online).map(e => e.response_time_minutes || 5))} min
                </span>
              </p>
              <div className="flex flex-wrap gap-3">
                {experts.filter(e => e.is_online).slice(0, 6).map(expert => (
                  <Card
                    key={expert.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-chart-2/20"
                    onClick={() => navigate(`/mentor/${expert.id}`)}
                  >
                    <CardContent className="flex items-center gap-3 p-3 pr-5">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={expert.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {expert.display_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-chart-2 ring-2 ring-background" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-tight">{expert.display_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{expert.response_time_minutes || 5} min reply
                          <span className="mx-1">·</span>
                          {format(expert.hourly_rate || 2.50)}/10min
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Subcategories */}
        <section className="py-8 border-t border-border/30">
          <div className="container mx-auto px-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Specialties</h2>
            <div className="flex flex-wrap gap-2">
              {meta.subcategories.map(sub => (
                <Badge
                  key={sub}
                  variant="outline"
                  className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/post-request?category=${meta.label}: ${sub}`)}
                >
                  {sub}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Top Experts */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Top Experts</h2>
              <Button variant="ghost" onClick={() => navigate(`/search?categories=${meta.label}`)}>
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : experts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {experts.slice(0, 8).map(expert => (
                  <Card
                    key={expert.id}
                    className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                    onClick={() => navigate(`/mentor/${expert.id}`)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="relative inline-block mb-3">
                        <Avatar className="h-16 w-16 ring-2 ring-border">
                          <AvatarImage src={expert.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-lg text-primary">
                            {expert.display_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {expert.is_online && (
                          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-chart-2 ring-2 ring-background" />
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground">{expert.display_name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        {expert.rating_avg?.toFixed(1) || "New"}
                        <span>·</span>
                        <span>{expert.total_sessions || 0} sessions</span>
                      </div>
                      {expert.is_online && (
                        <Badge variant="secondary" className="mt-2 text-xs gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-chart-2" />
                          Available now
                        </Badge>
                      )}
                      <div className="mt-3 pt-3 border-t border-border text-lg font-bold text-foreground">
                        {format(expert.hourly_rate || 2.50)}
                        <span className="text-xs font-normal text-muted-foreground">/10min</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No experts yet</h3>
                  <p className="text-muted-foreground mb-4">Be the first to offer {meta.label} services!</p>
                  <Button onClick={() => navigate("/settings")}>Become an Expert</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
      
    </div>
  );
};

export default CategoryPage;
