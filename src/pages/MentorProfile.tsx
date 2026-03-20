import { useState, useEffect, useLayoutEffect } from "react";
import { useSEO } from "@/hooks/use-seo";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SimilarExperts from "@/components/experts/SimilarExperts";
import PortfolioSection from "@/components/experts/PortfolioSection";
import AvailabilityBadge from "@/components/experts/AvailabilityBadge";
import ReportUserDialog from "@/components/reports/ReportUserDialog";
import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  MessageSquare,
  MapPin,
  Clock,
  Calendar,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Award,
  Share2,
  Heart,
  Flag,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

interface MentorProfileData {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  skills: string[];
  rating_avg: number;
  total_sessions: number;
  hourly_rate: number;
  is_online: boolean;
  location: string;
  timezone: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

const MentorProfile = () => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [mentor, setMentor] = useState<MentorProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);

  useSEO({
    title: mentor ? mentor.display_name : "Expert Profile",
    description: mentor ? `${mentor.display_name} — ${mentor.bio?.slice(0, 140) || "Verified expert on Druxio"}` : undefined,
    canonical: mentorId ? `/mentor/${mentorId}` : undefined,
    ogImage: mentor?.avatar_url || undefined,
    jsonLd: mentor ? {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": mentor.display_name,
      "description": mentor.bio || "Verified expert on Druxio",
      "image": mentor.avatar_url || undefined,
      "jobTitle": categories.length > 0 ? `${categories[0]} Expert` : "Freelance Expert",
      "url": `https://druxio.lovable.app/mentor/${mentorId}`,
      ...(reviews.length > 0 && mentor.rating_avg ? {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": mentor.rating_avg.toFixed(1),
          "reviewCount": reviews.length,
          "bestRating": "5",
          "worstRating": "1",
        },
      } : {}),
    } : undefined,
  });

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (mentorId) {
      fetchAll();
    }
  }, [mentorId]);

  const fetchAll = async () => {
    try {
      // Fetch profile, reviews, categories, and completed orders in parallel
      const [profileRes, reviewsRes, categoriesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, bio, avatar_url, location, timezone, skills, rating_avg, total_sessions, is_online, hourly_rate, response_time_minutes, is_banned, created_at, updated_at, goals").eq("id", mentorId).single(),
        supabase.from("reviews").select("*").eq("reviewee_id", mentorId).order("created_at", { ascending: false }),
        supabase.from("expert_categories").select("category").eq("user_id", mentorId!),
        supabase.from("quotes").select("id, job_id, status").eq("expert_id", mentorId!).eq("status", "accepted"),
      ]);

      if (profileRes.error) throw profileRes.error;
      setMentor(profileRes.data);

      // Enrich reviews with reviewer names
      if (reviewsRes.data) {
        const reviewerIds = [...new Set(reviewsRes.data.map(r => r.reviewer_id))];
        const { data: reviewerProfiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", reviewerIds);
        
        const profileMap = new Map(reviewerProfiles?.map(p => [p.id, p]) || []);
        
        setReviews(reviewsRes.data.map(r => ({
          ...r,
          reviewer_name: profileMap.get(r.reviewer_id)?.display_name || "Anonymous",
          reviewer_avatar: profileMap.get(r.reviewer_id)?.avatar_url || undefined,
        })));
      }

      // Extract unique main categories (second segment, e.g. "Valorant" from "Gaming: Valorant: Boosting")
      const rawCats = categoriesRes.data?.map(c => c.category) || [];
      const mainCats = [...new Set(rawCats.map(c => {
        const parts = c.split(":").map(p => p.trim());
        // Use second segment if exists (e.g. "Valorant"), otherwise first
        return parts.length >= 2 ? parts[1] : parts[0];
      }))];
      setCategories(mainCats);
      setCompletedOrders(ordersRes.data?.length || 0);
    } catch (error: any) {
      toast({ title: "Error loading profile", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Seller not found</h1>
          <Button onClick={() => navigate("/search")}>Browse Sellers</Button>
        </div>
      </div>
    );
  }

  // Rating breakdown
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));
  const totalReviews = reviews.length;
  const satisfactionRate = totalReviews > 0
    ? Math.round((reviews.filter(r => r.rating >= 4).length / totalReviews) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Top actions bar */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/search")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9"><Share2 className="h-4 w-4" /></Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 ${mentorId && isFavorite(mentorId) ? "text-destructive" : ""}`}
              onClick={() => mentorId && toggleFavorite(mentorId)}
            >
              <Heart className={`h-4 w-4 ${mentorId && isFavorite(mentorId) ? "fill-current" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setReportOpen(true)} title="Report this user"><Flag className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <Avatar className="h-24 w-24 ring-4 ring-border">
                      <AvatarImage src={mentor.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                        {mentor.display_name?.split(" ").map(n => n[0]).join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {mentor.is_online && (
                      <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-chart-2 ring-4 ring-background" />
                    )}
                  </div>
                  <h1 className="mt-4 text-2xl font-bold text-foreground">{mentor.display_name}</h1>
                  <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <MapPin className="h-4 w-4" /> {mentor.location || "Remote"}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-xl font-bold text-foreground">
                      <Star className="h-5 w-5 fill-primary text-primary" />
                      {mentor.rating_avg?.toFixed(1) || "New"}
                    </div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">{completedOrders}</div>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">{satisfactionRate}%</div>
                    <p className="text-xs text-muted-foreground">Satisfaction</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 mb-6">
                {mentor.is_online ? (
                    <Badge variant="default" className="gap-1 bg-chart-2 hover:bg-chart-2">
                      <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                      Online Now
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> Offline
                    </Badge>
                  )}
                  <AvailabilityBadge isOnline={mentor.is_online} responseTimeMinutes={(mentor as any).response_time_minutes} />
                </div>

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map(cat => (
                        <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {mentor.skills && mentor.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="reviews" className="w-full">
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="reviews">Reviews ({totalReviews})</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>

              <TabsContent value="reviews" className="space-y-6">
                {/* Rating Overview */}
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Big rating */}
                      <div className="text-center flex flex-col items-center justify-center">
                        <p className="text-5xl font-bold text-foreground mb-1">
                          {mentor.rating_avg?.toFixed(1) || "0.0"}
                        </p>
                        <div className="flex items-center gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-5 w-5 ${
                              s <= Math.round(mentor.rating_avg || 0)
                                ? "fill-primary text-primary"
                                : "text-muted-foreground/20"
                            }`} />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <TrendingUp className="h-4 w-4 text-chart-2" />
                          <span className="text-sm font-medium text-chart-2">{satisfactionRate}% satisfaction</span>
                        </div>
                      </div>

                      {/* Right: Breakdown */}
                      <div className="space-y-2">
                        {ratingCounts.map(({ star, count }) => (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-8">{star} ★</span>
                            <Progress
                              value={totalReviews > 0 ? (count / totalReviews) * 100 : 0}
                              className="h-2 flex-1"
                            />
                            <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Individual Reviews */}
                {reviews.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No reviews yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={review.reviewer_avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {review.reviewer_name?.charAt(0) || "A"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground">{review.reviewer_name}</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`h-3 w-3 ${
                                      s <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/20"
                                    }`} />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="portfolio" className="space-y-6">
                {mentorId && <PortfolioSection userId={mentorId} />}
              </TabsContent>

              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">About</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {mentor.bio || "This seller hasn't added a bio yet."}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5" /> Skills & Expertise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {mentor.skills?.length ? mentor.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1">{skill}</Badge>
                      )) : <p className="text-muted-foreground">No skills listed</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">Highlights</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-chart-2" />
                        <span className="text-muted-foreground">{completedOrders} completed orders</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-chart-2" />
                        <span className="text-muted-foreground">{satisfactionRate}% satisfaction rate</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Star className="h-5 w-5 fill-primary text-primary" />
                        <span className="text-muted-foreground">{mentor.rating_avg?.toFixed(1) || "No"} average rating</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </div>

        
      </main>

      {mentor && mentorId && (
        <ReportUserDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          reportedUserId={mentorId}
          reportedUserName={mentor.display_name || "Unknown"}
        />
      )}
    </div>
  );
};

export default MentorProfile;
