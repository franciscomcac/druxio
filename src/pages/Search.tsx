import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AvailabilityBadge from "@/components/experts/AvailabilityBadge";
import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Search as SearchIcon,
  Filter,
  Star,
  MessageSquare,
  Video,
  X,
  Loader2,
  Heart,
} from "lucide-react";

interface Mentor {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  skills: string[];
  rating_avg: number;
  total_sessions: number;
  hourly_rate: number;
  is_online: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [issueDescription, setIssueDescription] = useState(searchParams.get("issue") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")?.split(",").filter(Boolean) || []
  );
  const [priceRange, setPriceRange] = useState([0, 20]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchMentors();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchMentors = async () => {
    setLoading(true);
    try {
      // Fetch users who have the mentor role
      const { data: mentorRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "mentor");

      if (rolesError) throw rolesError;

      if (mentorRoles && mentorRoles.length > 0) {
        const mentorIds = mentorRoles.map(r => r.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", mentorIds);

        if (profilesError) throw profilesError;
        setMentors(profiles || []);
      } else {
        setMentors([]);
      }
    } catch (error) {
      console.error("Error fetching mentors:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredMentors = mentors.filter((mentor) => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = mentor.display_name?.toLowerCase().includes(query);
      const matchesBio = mentor.bio?.toLowerCase().includes(query);
      const matchesSkills = mentor.skills?.some(s => s.toLowerCase().includes(query));
      if (!matchesName && !matchesBio && !matchesSkills) return false;
    }

    // Category filter
    if (selectedCategories.length > 0) {
      const hasMatchingSkill = mentor.skills?.some(skill =>
        selectedCategories.some(cat => 
          skill.toLowerCase().includes(cat.toLowerCase())
        )
      );
      if (!hasMatchingSkill) return false;
    }

    // Price filter
    const rate = mentor.hourly_rate || 2.50;
    if (rate < priceRange[0] || rate > priceRange[1]) return false;

    // Online filter
    if (onlineOnly && !mentor.is_online) return false;

    // Rating filter
    if (minRating > 0 && (mentor.rating_avg || 0) < minRating) return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Find Your Expert</h1>
          <p className="text-muted-foreground">
            Browse experts in any field or describe what you need for AI-powered matching
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Search Input */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Search
                  </label>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search experts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Issue Description */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Describe What You Need
                  </label>
                  <Textarea
                    placeholder="E.g., I need help learning guitar, marketing advice, fitness coaching..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="min-h-24"
                  />
                </div>

                {/* Categories */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {categories.slice(0, 20).map((category) => (
                      <Badge
                        key={category.id}
                        variant={selectedCategories.includes(category.name) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleCategory(category.name)}
                      >
                        {category.name}
                        {selectedCategories.includes(category.name) && (
                          <X className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}/10min
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={20}
                    min={0}
                    step={0.5}
                    className="mt-4"
                  />
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Minimum Rating
                  </label>
                  <div className="flex gap-2">
                    {[0, 3, 4, 4.5].map((rating) => (
                      <Button
                        key={rating}
                        variant={minRating === rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMinRating(rating)}
                        className="gap-1"
                      >
                        {rating === 0 ? "Any" : (
                          <>
                            {rating}
                            <Star className="h-3 w-3 fill-current" />
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Online Only */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="online-only"
                    checked={onlineOnly}
                    onCheckedChange={(checked) => setOnlineOnly(checked as boolean)}
                  />
                  <label
                    htmlFor="online-only"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Online now only
                  </label>
                </div>

                {/* Clear Filters */}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("");
                    setIssueDescription("");
                    setSelectedCategories([]);
                    setPriceRange([0, 20]);
                    setOnlineOnly(false);
                    setMinRating(0);
                  }}
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Mobile filter toggle */}
            <div className="mb-4 lg:hidden">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            {/* Results count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-muted-foreground">
                {loading ? "Loading..." : `${filteredMentors.length} experts found`}
              </p>
            </div>

            {/* Mentor Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMentors.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredMentors.map((mentor) => (
                  <Card 
                    key={mentor.id} 
                    className="group relative overflow-hidden transition-all hover:shadow-lg cursor-pointer"
                    onClick={() => navigate(`/mentor/${mentor.id}`)}
                  >
                    {/* Online indicator */}
                    {mentor.is_online && (
                      <div className="absolute right-3 top-3 z-10">
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                        </span>
                      </div>
                    )}

                    <CardContent className="p-4">
                      {/* Avatar and info */}
                      <div className="mb-4 flex flex-col items-center text-center">
                        <Avatar className="mb-3 h-16 w-16 ring-2 ring-border">
                          <AvatarImage src={mentor.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-lg text-primary">
                            {mentor.display_name?.split(" ").map(n => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-foreground">{mentor.display_name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{mentor.bio || "Expert"}</p>
                        <AvailabilityBadge isOnline={mentor.is_online} responseTimeMinutes={(mentor as any).response_time_minutes} />
                      </div>

                      {/* Stats */}
                      <div className="mb-4 flex items-center justify-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span className="font-medium text-foreground">
                            {mentor.rating_avg?.toFixed(1) || "New"}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          {mentor.total_sessions || 0} sessions
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="mb-4 flex flex-wrap justify-center gap-1">
                        {mentor.skills?.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {mentor.skills && mentor.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{mentor.skills.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Price and CTA */}
                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <span className="text-lg font-bold text-foreground">
                          ${(mentor.hourly_rate || 2.50).toFixed(2)}
                          <span className="text-xs font-normal text-muted-foreground">/10min</span>
                        </span>
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className={`h-8 w-8 ${isFavorite(mentor.id) ? "text-destructive" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(mentor.id);
                            }}
                          >
                            <Heart className={`h-4 w-4 ${isFavorite(mentor.id) ? "fill-current" : ""}`} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/mentor/${mentor.id}`);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No experts found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;
