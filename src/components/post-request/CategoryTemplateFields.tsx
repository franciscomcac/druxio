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

type Field = { key: string; label: string; type: "text" | "select"; options?: string[]; showWhen?: { key: string; values: string[] } };

// Game-specific templates
const GAMING_TEMPLATES: Record<string, Field[]> = {
  Minecraft: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Custom Build (house, castle, city, etc.)", "Server Setup & Config", "Plugin / Mod Installation", "Redstone Contraption", "World Edit / Terraforming", "Skin / Resource Pack", "Mini-Game / Map Design", "Survival Coaching", "Speedrun Coaching", "Other"] },
    { key: "minecraft_edition", label: "Edition", type: "select", options: ["Java", "Bedrock", "Both / Either"] },
    { key: "build_style", label: "Build Style", type: "select", options: ["Medieval", "Modern", "Fantasy", "Futuristic", "Realistic", "Pixel Art", "Redstone-Heavy", "No preference"], showWhen: { key: "service_type", values: ["Custom Build (house, castle, city, etc.)", "World Edit / Terraforming", "Mini-Game / Map Design"] } },
    { key: "build_size", label: "Approximate Size", type: "select", options: ["Small (single structure)", "Medium (compound / village)", "Large (city / landscape)", "Mega (server spawn / map)"], showWhen: { key: "service_type", values: ["Custom Build (house, castle, city, etc.)", "World Edit / Terraforming"] } },
    { key: "server_type", label: "Server Type", type: "select", options: ["Vanilla", "Spigot / Paper", "Fabric", "Forge", "BungeeCord / Velocity", "Modpack"], showWhen: { key: "service_type", values: ["Server Setup & Config", "Plugin / Mod Installation"] } },
    { key: "player_count", label: "Expected Players", type: "select", options: ["1-5 (private)", "5-20 (small community)", "20-100 (medium)", "100+ (large)"], showWhen: { key: "service_type", values: ["Server Setup & Config", "Plugin / Mod Installation", "Mini-Game / Map Design"] } },
    { key: "reference", label: "Reference / Inspiration (link or description)", type: "text" },
  ],
  Valorant: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Rank Boosting", "Duo Boosting", "Coaching / VOD Review", "Agent-Specific Training", "Placement Matches", "Win Boosting", "Other"] },
    { key: "current_rank", label: "Current Rank", type: "select", options: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"] },
    { key: "desired_rank", label: "Desired Rank", type: "select", options: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"], showWhen: { key: "service_type", values: ["Rank Boosting", "Duo Boosting", "Coaching / VOD Review"] } },
    { key: "main_agents", label: "Main Agent(s)", type: "text" },
    { key: "region", label: "Region", type: "select", options: ["NA", "EU", "AP", "KR", "BR", "LATAM"] },
  ],
  Fortnite: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Arena Coaching", "Build / Edit Training", "Duo / Squad Carry", "Tournament Prep", "Creative Mode Training", "Win Boosting", "Account Leveling", "Other"] },
    { key: "skill_level", label: "Your Skill Level", type: "select", options: ["Beginner (0-50 wins)", "Intermediate (50-200 wins)", "Advanced (200+ wins)", "Competitive / Arena"] },
    { key: "input_method", label: "Input Method", type: "select", options: ["Controller", "Keyboard & Mouse"] },
    { key: "platform", label: "Platform", type: "select", options: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"] },
    { key: "focus_area", label: "Focus Area", type: "select", options: ["Building", "Editing", "Aim", "Game Sense", "Rotations", "Overall Improvement"], showWhen: { key: "service_type", values: ["Arena Coaching", "Build / Edit Training", "Creative Mode Training", "Tournament Prep"] } },
  ],
  CS2: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Rank Boosting", "Coaching / Demo Review", "Duo Queue Partner", "Aim Training Plan", "Strat Calling / IGL Coaching", "Faceit / ESEA Boosting", "Other"] },
    { key: "current_rank", label: "Current Rank / Rating", type: "text" },
    { key: "desired_rank", label: "Desired Rank / Rating", type: "text", showWhen: { key: "service_type", values: ["Rank Boosting", "Faceit / ESEA Boosting", "Coaching / Demo Review"] } },
    { key: "main_role", label: "Main Role", type: "select", options: ["Entry Fragger", "AWPer", "Support", "Lurker", "IGL", "Flex"] },
    { key: "region", label: "Region", type: "select", options: ["NA", "EU", "Asia", "OCE", "Other"] },
  ],
  Apex: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Rank Boosting", "Coaching / VOD Review", "Duo / Trio Carry", "Badge Unlocking (20 kill, 4k dmg)", "Placement Help", "Legend-Specific Training", "Other"] },
    { key: "current_rank", label: "Current Rank", type: "select", options: ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Predator"] },
    { key: "desired_rank", label: "Desired Rank", type: "select", options: ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Predator"], showWhen: { key: "service_type", values: ["Rank Boosting", "Coaching / VOD Review"] } },
    { key: "main_legend", label: "Main Legend(s)", type: "text" },
    { key: "platform", label: "Platform", type: "select", options: ["PC", "PlayStation", "Xbox"] },
  ],
  "League of Legends": [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Rank Boosting", "Duo Boosting", "Coaching / Replay Review", "Role-Specific Training", "Champion Mastery", "Placement Matches", "Clash / Tournament Team", "Other"] },
    { key: "current_rank", label: "Current Rank", type: "select", options: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"] },
    { key: "desired_rank", label: "Desired Rank", type: "select", options: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"], showWhen: { key: "service_type", values: ["Rank Boosting", "Duo Boosting", "Coaching / Replay Review"] } },
    { key: "main_role", label: "Main Role", type: "select", options: ["Top", "Jungle", "Mid", "ADC", "Support", "Fill"] },
    { key: "main_champions", label: "Main Champion(s)", type: "text" },
    { key: "region", label: "Server", type: "select", options: ["NA", "EUW", "EUNE", "KR", "BR", "LAN", "LAS", "OCE", "Other"] },
  ],
};

const GAMING_DEFAULT: Field[] = [
  { key: "service_type", label: "What do you need?", type: "select", options: ["Boosting / Rank Up", "Coaching / Lessons", "Carry / Duo Partner", "Account Setup", "Strategy / Review", "Modding / Custom Work", "Other"] },
  { key: "current_rank", label: "Current Rank / Level", type: "text", showWhen: { key: "service_type", values: ["Boosting / Rank Up", "Coaching / Lessons", "Carry / Duo Partner"] } },
  { key: "desired_rank", label: "Desired Rank / Goal", type: "text", showWhen: { key: "service_type", values: ["Boosting / Rank Up", "Coaching / Lessons"] } },
  { key: "platform", label: "Platform", type: "select", options: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"] },
  { key: "region", label: "Server Region", type: "select", options: ["NA", "EU", "Asia", "OCE", "Other"] },
];

// Non-gaming category templates
const TEMPLATES: Record<string, Field[]> = {
  Tech: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Build from Scratch", "Bug Fix / Troubleshoot", "Feature Addition", "Code Review", "Setup / Config", "Migration", "Consultation / Advice", "Other"] },
    { key: "tech_stack", label: "Tech Stack / Framework", type: "text" },
    { key: "deadline_urgency", label: "Urgency", type: "select", options: ["ASAP", "This week", "This month", "Flexible"] },
  ],
  Business: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Strategy / Planning", "Marketing Campaign", "Financial Advice", "Legal Guidance", "Growth Hacking", "Store Setup", "Consultation", "Other"] },
    { key: "business_stage", label: "Business Stage", type: "select", options: ["Idea stage", "Pre-revenue", "Early revenue", "Scaling", "Established"] },
    { key: "industry", label: "Industry / Niche", type: "text" },
    { key: "budget_range", label: "Monthly Budget", type: "select", options: ["< $500", "$500 - $2k", "$2k - $10k", "$10k+", "Not sure"] },
  ],
  Creative: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Design from Scratch", "Edit / Revise Existing", "Brand Identity", "Video Production", "Copywriting", "Thumbnails / Banners", "UI/UX Design", "Other"] },
    { key: "brand_name", label: "Brand / Project Name", type: "text" },
    { key: "style_reference", label: "Style Reference (link or description)", type: "text" },
  ],
  Music: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Production / Beat Making", "Mixing & Mastering", "Lessons / Coaching", "Song Writing", "Sound Design", "Live Session", "Other"] },
    { key: "genre", label: "Genre", type: "text" },
    { key: "daw", label: "DAW / Software", type: "select", options: ["Ableton", "FL Studio", "Logic Pro", "Pro Tools", "Reaper", "Other", "N/A"] },
    { key: "experience_level", label: "Your Experience Level", type: "select", options: ["Beginner", "Intermediate", "Advanced"], showWhen: { key: "service_type", values: ["Lessons / Coaching", "Production / Beat Making"] } },
  ],
  Fitness: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Personal Training Plan", "Nutrition / Meal Plan", "Form Check / Review", "Program Design", "Accountability Coach", "Competition Prep", "Other"] },
    { key: "fitness_goal", label: "Primary Goal", type: "select", options: ["Weight Loss", "Muscle Gain", "Endurance", "Flexibility", "General Health", "Competition Prep"] },
    { key: "experience_level", label: "Experience Level", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
    { key: "equipment_access", label: "Equipment Access", type: "select", options: ["Full Gym", "Home Gym", "Bodyweight Only", "Minimal Equipment"] },
  ],
  Languages: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Live Tutoring", "Conversation Practice", "Written Translation", "Exam Prep", "Business Language", "Proofreading", "Other"] },
    { key: "current_level", label: "Current Level", type: "select", options: ["Complete Beginner", "Elementary (A1-A2)", "Intermediate (B1-B2)", "Advanced (C1-C2)"] },
  ],
  Content: [
    { key: "service_type", label: "What do you need?", type: "select", options: ["Channel Strategy", "Content Editing", "Thumbnail Design", "Growth / Analytics Review", "Stream Setup", "Scripting", "Consultation", "Other"] },
    { key: "platform_target", label: "Target Platform", type: "select", options: ["YouTube", "TikTok", "Twitch", "Instagram", "Podcast", "Other"] },
    { key: "current_audience", label: "Current Audience Size", type: "select", options: ["Starting out (0-100)", "Growing (100-1k)", "Established (1k-10k)", "Large (10k+)"] },
  ],
};

const getFieldsForCategory = (category: string): { label: string; fields: Field[] } | null => {
  const broadCategory = category.split(":")[0]?.trim() || category;
  const subcategory = category.split(":")[1]?.trim();

  if (broadCategory === "Gaming") {
    if (subcategory && GAMING_TEMPLATES[subcategory]) {
      return { label: subcategory, fields: GAMING_TEMPLATES[subcategory] };
    }
    return { label: "Gaming", fields: GAMING_DEFAULT };
  }

  if (TEMPLATES[broadCategory]) {
    return { label: broadCategory, fields: TEMPLATES[broadCategory] };
  }

  return null;
};

const CategoryTemplateFields = ({ category, templateData, onChange }: Props) => {
  const result = getFieldsForCategory(category);

  if (!result) return null;

  const { label, fields: allFields } = result;

  const fields = allFields.filter(field => {
    if (!field.showWhen) return true;
    const depValue = templateData[field.showWhen.key];
    return depValue && field.showWhen.values.includes(depValue);
  });

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-accent/10">
      <p className="text-sm font-medium text-foreground">
        {label}-specific details <span className="text-muted-foreground font-normal">(optional but helps experts)</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(field => (
          <div key={field.key} className={`space-y-1.5 ${field.key === "service_type" ? "sm:col-span-2" : ""}`}>
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
