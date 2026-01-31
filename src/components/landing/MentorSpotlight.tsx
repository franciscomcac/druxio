import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, Video } from "lucide-react";

const spotlightMentors = [
  {
    id: 1,
    name: "Alex Rivera",
    title: "Senior React Developer",
    avatar: "",
    rating: 4.9,
    sessions: 342,
    skills: ["React", "TypeScript", "Next.js"],
    price: "$2.50",
    isOnline: true,
  },
  {
    id: 2,
    name: "Jamie Park",
    title: "Java Architect",
    avatar: "",
    rating: 5.0,
    sessions: 518,
    skills: ["Java", "Spring Boot", "PostgreSQL"],
    price: "$3.00",
    isOnline: true,
  },
  {
    id: 3,
    name: "Morgan Lee",
    title: "Full-Stack Developer",
    avatar: "",
    rating: 4.8,
    sessions: 276,
    skills: ["Python", "Django", "AWS"],
    price: "$2.75",
    isOnline: true,
  },
  {
    id: 4,
    name: "Taylor Swift",
    title: "DevOps Engineer",
    avatar: "",
    rating: 4.9,
    sessions: 189,
    skills: ["Docker", "Kubernetes", "CI/CD"],
    price: "$3.50",
    isOnline: false,
  },
  {
    id: 5,
    name: "Jordan Chen",
    title: "Gaming & Minecraft Expert",
    avatar: "",
    rating: 4.7,
    sessions: 423,
    skills: ["Minecraft", "Java", "Discord Bots"],
    price: "$2.00",
    isOnline: true,
  },
];

const MentorSpotlight = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-card/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-foreground">
              Top Mentors Online Now
            </h2>
            <p className="text-muted-foreground">
              Connect with our highest-rated experts ready to help
            </p>
          </div>
          <Link to="/search">
            <Button variant="outline">View All Mentors</Button>
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {spotlightMentors.map((mentor) => (
            <Card
              key={mentor.id}
              className="group relative overflow-hidden border-border bg-card transition-all hover:shadow-lg cursor-pointer"
              onClick={() => navigate("/search")}
            >
              {/* Online indicator */}
              {mentor.isOnline && (
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
                    <AvatarImage src={mentor.avatar} />
                    <AvatarFallback className="bg-primary/10 text-lg text-primary">
                      {mentor.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-foreground">{mentor.name}</h3>
                  <p className="text-sm text-muted-foreground">{mentor.title}</p>
                </div>

                {/* Stats */}
                <div className="mb-4 flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-medium text-foreground">{mentor.rating}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {mentor.sessions} sessions
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-4 flex flex-wrap justify-center gap-1">
                  {mentor.skills.slice(0, 2).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {mentor.skills.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{mentor.skills.length - 2}
                    </Badge>
                  )}
                </div>

                {/* Price and CTA */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-lg font-bold text-foreground">
                    {mentor.price}
                    <span className="text-xs font-normal text-muted-foreground">/10min</span>
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MentorSpotlight;
