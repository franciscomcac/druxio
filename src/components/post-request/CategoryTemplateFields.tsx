import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  category: string;
  templateData: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const TEMPLATES: Record<string, { key: string; label: string; type: "text" | "select"; options?: string[] }[]> = {
  Gaming: [
    { key: "current_rank", label: "Current Rank / Level", type: "text" },
    { key: "desired_rank", label: "Desired Rank / Goal", type: "text" },
    { key: "platform", label: "Platform", type: "select", options: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"] },
    { key: "region", label: "Server Region", type: "select", options: ["NA", "EU", "Asia", "OCE", "Other"] },
  ],
  Tech: [
    { key: "tech_stack", label: "Tech Stack / Framework", type: "text" },
    { key: "project_type", label: "Project Type", type: "select", options: ["New Build", "Bug Fix", "Feature Addition", "Migration", "Setup", "Other"] },
    { key: "deadline_urgency", label: "Urgency", type: "select", options: ["ASAP", "This week", "This month", "Flexible"] },
  ],
  Business: [
    { key: "business_stage", label: "Business Stage", type: "select", options: ["Idea stage", "Pre-revenue", "Early revenue", "Scaling", "Established"] },
    { key: "industry", label: "Industry / Niche", type: "text" },
    { key: "budget_range", label: "Monthly Budget", type: "select", options: ["< $500", "$500 - $2k", "$2k - $10k", "$10k+", "Not sure"] },
  ],
  Creative: [
    { key: "brand_name", label: "Brand / Project Name", type: "text" },
    { key: "style_reference", label: "Style Reference (link or description)", type: "text" },
    { key: "deliverable_type", label: "Deliverable Type", type: "select", options: ["Logo", "Social Media Graphics", "Video", "Thumbnails", "Ad Copy", "Full Branding", "Other"] },
  ],
  Music: [
    { key: "genre", label: "Genre", type: "text" },
    { key: "daw", label: "DAW / Software", type: "select", options: ["Ableton", "FL Studio", "Logic Pro", "Pro Tools", "Reaper", "Other", "N/A"] },
    { key: "experience_level", label: "Your Experience Level", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
  ],
  Fitness: [
    { key: "fitness_goal", label: "Primary Goal", type: "select", options: ["Weight Loss", "Muscle Gain", "Endurance", "Flexibility", "General Health", "Competition Prep"] },
    { key: "experience_level", label: "Experience Level", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
    { key: "equipment_access", label: "Equipment Access", type: "select", options: ["Full Gym", "Home Gym", "Bodyweight Only", "Minimal Equipment"] },
  ],
  Languages: [
    { key: "current_level", label: "Current Level", type: "select", options: ["Complete Beginner", "Elementary (A1-A2)", "Intermediate (B1-B2)", "Advanced (C1-C2)"] },
    { key: "learning_goal", label: "Learning Goal", type: "select", options: ["Conversation", "Business", "Exam Prep", "Travel", "Reading/Writing", "General Fluency"] },
  ],
  Content: [
    { key: "platform_target", label: "Target Platform", type: "select", options: ["YouTube", "TikTok", "Twitch", "Instagram", "Podcast", "Other"] },
    { key: "current_audience", label: "Current Audience Size", type: "select", options: ["Starting out (0-100)", "Growing (100-1k)", "Established (1k-10k)", "Large (10k+)"] },
    { key: "content_type", label: "Content Type", type: "text" },
  ],
};

const CategoryTemplateFields = ({ category, templateData, onChange }: Props) => {
  const broadCategory = category.split(":")[0]?.trim() || category;
  const fields = TEMPLATES[broadCategory];

  if (!fields) return null;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-accent/10">
      <p className="text-sm font-medium text-foreground">
        {broadCategory}-specific details <span className="text-muted-foreground font-normal">(optional but helps experts)</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(field => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm">{field.label}</Label>
            {field.type === "select" && field.options ? (
              <Select value={templateData[field.key] || ""} onValueChange={v => onChange(field.key, v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={field.label}
                value={templateData[field.key] || ""}
                onChange={e => onChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryTemplateFields;
