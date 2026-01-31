import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SimilarExperts from "@/components/experts/SimilarExperts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Star,
  MessageSquare,
  Video,
  MapPin,
  Clock,
  Calendar,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Users,
  Award,
  Share2,
  Heart,
  Flag,
} from "lucide-react";

interface MentorProfile {
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
  comment: string;
  created_at: string;
  reviewer_id: string;
}

const MentorProfile = () => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (mentorId) {
      fetchMentor();
      fetchReviews();
    }
  }, [mentorId]);

  const fetchMentor = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", mentorId)
        .single();

      if (error) throw error;
      setMentor(data);
    } catch (error: any) {
      toast({
        title: "Error loading mentor",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewee_id", mentorId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setReviews(data);
    }
  };

  const handleRequestSession = async (type: "chat" | "video") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setRequesting(true);
    try {
      const { data: newSession, error } = await supabase
        .from("sessions")
        .insert({
          mentee_id: session.user.id,
          mentor_id: mentorId,
          status: "pending",
          session_type: type,
          price: type === "chat" ? 1.99 : 4.99,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Session requested!",
        description: "The mentor will be notified of your request.",
      });

      navigate(`/session/${newSession.id}`);
    } catch (error: any) {
      toast({
        title: "Failed to request session",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
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
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Expert not found</h1>
          <Button onClick={() => navigate("/search")}>Browse Experts</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Top actions bar */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <Flag className="h-4 w-4" />
            </Button>
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
                      <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 ring-4 ring-background" />
                    )}
                  </div>
                  <h1 className="mt-4 text-2xl font-bold text-foreground">
                    {mentor.display_name}
                  </h1>
                  <p className="text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {mentor.location || "Remote"}
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
                    <div className="text-xl font-bold text-foreground">
                      {mentor.total_sessions || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      ${(mentor.hourly_rate || 2.50).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">/10 min</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {mentor.is_online ? (
                    <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-500">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      Online Now
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Offline
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => handleRequestSession("chat")}
                    disabled={requesting}
                  >
                    {requesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    Chat Session - $1.99
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => handleRequestSession("video")}
                    disabled={requesting}
                  >
                    {requesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Video className="h-4 w-4" />
                    )}
                    Video Call - $4.99
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                {/* Bio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {mentor.bio || "This mentor hasn't added a bio yet."}
                    </p>
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Skills & Expertise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {mentor.skills?.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1">
                          {skill}
                        </Badge>
                      )) || (
                        <p className="text-muted-foreground">No skills listed</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Highlights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Why Choose Me</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-muted-foreground">Fast response time</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-muted-foreground">Verified expertise</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-muted-foreground">100% satisfaction rate</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4">
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
                        <div className="flex items-center gap-2 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "fill-primary text-primary"
                                  : "text-muted"
                              }`}
                            />
                          ))}
                          <span className="text-sm text-muted-foreground ml-2">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="availability">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Weekly Availability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <div key={day} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                          <span className="font-medium text-foreground">{day}</span>
                          <span className="text-muted-foreground">9:00 AM - 5:00 PM</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground text-center">
                      Timezone: {mentor.timezone || "UTC"}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Similar Experts Carousel */}
        <SimilarExperts 
          currentExpertId={mentorId || ""} 
          skills={mentor.skills || []} 
        />
      </main>

      <Footer />
    </div>
  );
};

export default MentorProfile;
