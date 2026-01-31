import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, X } from "lucide-react";

const categories = [
  "React", "Java", "Python", "JavaScript", "TypeScript", "Node.js",
  "Next.js", "APIs", "PostgreSQL", "Git", "Docker", "AWS"
];

const QuickHelpForm = () => {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [issueText, setIssueText] = useState("");

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to search with query params
    const params = new URLSearchParams();
    if (selectedCategories.length > 0) {
      params.set("categories", selectedCategories.join(","));
    }
    if (issueText) {
      params.set("issue", issueText);
    }
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="bg-background py-16" id="quick-help">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground">
              What do you need help with?
            </h2>
            <p className="text-muted-foreground">
              Select your tech stack and describe your issue. We'll match you with the best mentors.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category chips */}
            <div className="rounded-xl border border-border bg-card p-6">
              <label className="mb-3 block text-sm font-medium text-foreground">
                Select categories (click to toggle)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5 text-sm transition-all hover:scale-105"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                    {selectedCategories.includes(category) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Issue textarea */}
            <div className="rounded-xl border border-border bg-card p-6">
              <label className="mb-3 block text-sm font-medium text-foreground">
                Describe your issue
              </label>
              <Textarea
                placeholder="E.g., I'm getting a 'Cannot read property of undefined' error in my React component when trying to map over an array..."
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                className="min-h-32 resize-none"
              />
              
              {/* File upload hint */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-accent/30 p-4">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Drag & drop code snippets or screenshots here (optional)
                </span>
              </div>
            </div>

            {/* Submit button */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full gap-2 py-6 text-lg"
            >
              <Search className="h-5 w-5" />
              Find Mentors Now
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default QuickHelpForm;
