import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Target,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  X,
} from "lucide-react";

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

const EXPERTISE_OPTIONS = [
  "Web Development", "Mobile Apps", "AI & Machine Learning", "Data Science",
  "Marketing", "Business Strategy", "Finance & Investing", "Legal",
  "Graphic Design", "Video Editing", "Music Production", "Photography",
  "Fitness Training", "Nutrition", "Life Coaching", "Language Learning",
  "Gaming", "Writing", "Career Advice", "Real Estate",
];

const GOAL_OPTIONS = [
  "Learn new skills", "Get help with a project", "Find a mentor",
  "Solve a specific problem", "Career transition", "Start a business",
  "Improve health & fitness", "Creative projects", "Personal growth",
];

const OnboardingWizard = ({ userId, onComplete }: OnboardingWizardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal]
    );
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills((prev) => [...prev, customSkill.trim()]);
      setCustomSkill("");
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || undefined,
          bio: bio || undefined,
          skills: selectedSkills.length > 0 ? selectedSkills : undefined,
          goals: selectedGoals.length > 0 ? selectedGoals : undefined,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your profile has been set up successfully.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return displayName.trim().length >= 2;
      case 2:
        return selectedSkills.length > 0;
      case 3:
        return selectedGoals.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 shadow-2xl border-border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {step === 1 && <User className="h-6 w-6 text-primary" />}
            {step === 2 && <Sparkles className="h-6 w-6 text-primary" />}
            {step === 3 && <Target className="h-6 w-6 text-primary" />}
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && "Let's get to know you"}
            {step === 2 && "What are you good at?"}
            {step === 3 && "What are your goals?"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Tell us a bit about yourself"}
            {step === 2 && "Select your areas of expertise or interests"}
            {step === 3 && "What do you want to achieve?"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="How should we call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others about yourself, your experience, or what you're looking for..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="min-h-24"
                />
              </div>
            </div>
          )}

          {/* Step 2: Skills/Expertise */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_OPTIONS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5 text-sm transition-all hover:scale-105"
                    onClick={() => toggleSkill(skill)}
                  >
                    {selectedSkills.includes(skill) && (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    {skill}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom skill..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomSkill()}
                />
                <Button variant="outline" onClick={addCustomSkill}>
                  Add
                </Button>
              </div>

              {selectedSkills.length > 0 && (
                <div className="rounded-lg bg-accent/50 p-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Selected ({selectedSkills.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSkills.map((skill) => (
                      <Badge
                        key={skill}
                        className="gap-1"
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {GOAL_OPTIONS.map((goal) => (
                  <div
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all hover:border-primary ${
                      selectedGoals.includes(goal)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        selectedGoals.includes(goal)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedGoals.includes(goal) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{goal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Complete Setup
              </Button>
            )}
          </div>

          {/* Skip option */}
          <div className="text-center">
            <Button
              variant="link"
              className="text-muted-foreground"
              onClick={onComplete}
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;
