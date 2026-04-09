import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import UserAvatar from "@/components/UserAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Star, MessageSquare, Video, ChevronRight } from "lucide-react";

interface Expert {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  rating_avg: number | null;
  total_sessions: number | null;
  hourly_rate: number | null;
  is_online: boolean | null;
}

interface SimilarExpertsProps {
  currentExpertId: string;
  skills?: string[];
}

const SimilarExperts = ({ currentExpertId, skills = [] }: SimilarExpertsProps) => {
  const navigate = useNavigate();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarExperts = async () => {
      try {
        // Fetch experts who have at least one matching skill
        let query = supabase
          .from("profiles")
          .select("id, display_name, avatar_url, skills, rating_avg, total_sessions, hourly_rate, is_online")
          .neq("id", currentExpertId)
          .limit(10);

        // If we have skills, try to find similar ones
        if (skills.length > 0) {
          query = query.overlaps("skills", skills);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching similar experts:", error);
          // Fallback to fetching any experts
          const fallback = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, skills, rating_avg, total_sessions, hourly_rate, is_online")
            .neq("id", currentExpertId)
            .order("rating_avg", { ascending: false, nullsFirst: false })
            .limit(10);
          
          if (fallback.data) {
            setExperts(fallback.data);
          }
        } else {
          setExperts(data || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarExperts();
  }, [currentExpertId, skills]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">Similar Experts</h3>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="min-w-[250px]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (experts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 mt-12">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">Similar Experts You May Like</h3>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/search")}>
          View All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: experts.length > 4,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {experts.map((expert) => (
            <CarouselItem key={expert.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => navigate(`/mentor/${expert.id}`)}
              >
                <CardContent className="p-4">
                  {/* Header with avatar and online status */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative">
                      <UserAvatar src={expert.avatar_url || undefined} userId={expert.id} name={expert.display_name} className="h-12 w-12 ring-2 ring-border" />
                      {expert.is_online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {expert.display_name || "Expert"}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        <span>{expert.rating_avg?.toFixed(1) || "New"}</span>
                        <span>•</span>
                        <span>{expert.total_sessions || 0} jobs</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {expert.skills && expert.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {expert.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {expert.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{expert.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Price and actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-bold text-foreground">
                      ${(expert.hourly_rate || 2.50).toFixed(2)}
                      <span className="text-xs font-normal text-muted-foreground">/10min</span>
                    </span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <Video className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4 hidden md:flex" />
        <CarouselNext className="-right-4 hidden md:flex" />
      </Carousel>
    </section>
  );
};

export default SimilarExperts;
