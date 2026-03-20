import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fallback broad categories in case DB is empty
const FALLBACK_BROAD = ["Gaming", "Tech", "Business", "Creative", "Music", "Fitness", "Languages", "Content"];

async function fetchCategoriesFromDB(): Promise<{ broadCategories: string[]; allCategories: string[] }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await sb
    .from("expert_categories")
    .select("category");

  if (error || !data || data.length === 0) {
    console.warn("Could not fetch categories from DB, using fallback", error);
    return { broadCategories: FALLBACK_BROAD, allCategories: [] };
  }

  const uniqueCats = [...new Set(data.map((r: any) => r.category as string))];

  // Extract broad categories (first segment before ":")
  const broadSet = new Set<string>();
  // Extract "Broad: Sub" level categories for matching
  const subSet = new Set<string>();

  for (const cat of uniqueCats) {
    const parts = cat.split(":").map((p: string) => p.trim());
    if (parts[0]) broadSet.add(parts[0]);
    if (parts.length >= 2) subSet.add(`${parts[0]}: ${parts[1]}`);
  }

  // Also add fallback broads in case some aren't represented yet
  for (const b of FALLBACK_BROAD) broadSet.add(b);

  return {
    broadCategories: [...broadSet].sort(),
    allCategories: [...subSet].sort(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIdea } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Dynamically fetch categories from the database
    const { broadCategories, allCategories } = await fetchCategoriesFromDB();

    const categoryList = allCategories.length > 0
      ? allCategories.join(", ")
      : "Gaming: Valorant, Gaming: Arc Raiders, Gaming: Fortnite, Tech: Web Dev, Tech: Discord Bots, Business: Marketing, Creative: Graphic Design, Music: Production, Fitness: Personal Training, Languages: English, Content: YouTube";

    const systemPrompt = `You are an assistant for Druxio, a marketplace where people post requests and experts respond with quotes.

Your job: Take the user's raw idea/need and determine if it fits any of the services offered on Druxio, then refine it into a clear request.

Available categories (dynamically loaded from platform): ${categoryList}
Broad categories: ${broadCategories.join(", ")}

CRITICAL: REJECTION LOGIC
- First, evaluate whether the request makes sense for ANY category on the platform.
- If the request is nonsensical, gibberish, unrelated to any service (e.g. "need help with my boat", "walk my dog", "cook me dinner", "asdfghjkl", "hello"), you MUST set rejected=true and provide a rejection_reason explaining that this service isn't available on Druxio.
- Only reject if the request genuinely doesn't fit ANY category. Be reasonable — if there's even a loose connection (e.g. "help with my boat website" → Tech: Web Dev), accept it.
- Random words, greetings without context, or requests for physical/local services that can't be done online should be rejected.

IF NOT REJECTED:
1. Suggest a clear, concise title (max 80 chars)
2. Write a refined description (max 300 chars) that clarifies their need
3. Pick the best matching category from the available list
4. If no specific subcategory fits, use "Custom Request" under the most relevant broad category (e.g. "Gaming: Custom Request")
5. The category format must always be "Broad: Subcategory" exactly as listed above
6. NEVER invent categories not in the list — pick the closest match.

IMPORTANT TONE RULES:
- For Gaming requests: be casual and speak their language. You know what boosting, smurfing, carries, rank grinding, 1v1ing, brainrot, aura, skibidi, sigma, gyatt, and all the gaming/internet slang means. Don't formalize it too much — keep the vibe. If someone says "I need a cracked Roblox scripter" you know exactly what they mean. Understand terms like obby, blox fruits, da hood, mm2, pet sim, adopt me, bedwars, skyblock, hypixel, etc. Don't translate slang into corporate speak.
- For non-gaming requests: keep it professional but approachable.

Be helpful but don't over-embellish. Keep the user's voice and energy.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here's what I need help with: "${userIdea}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "refine_request",
              description: "Return a refined request with title, description, and category suggestions, or reject if the request doesn't fit any service.",
              parameters: {
                type: "object",
                properties: {
                  rejected: { type: "boolean", description: "Set to true if the request doesn't fit any category on the platform" },
                  rejection_reason: { type: "string", description: "If rejected, a friendly explanation of why (e.g. 'This service isn't available on Druxio. We offer digital services like gaming coaching, tech help, design, and more.')" },
                  title: { type: "string", description: "A clear concise title for the request (max 80 chars). Empty string if rejected." },
                  description: { type: "string", description: "A refined description that clarifies the user's need (max 300 chars). Empty string if rejected." },
                  category: { type: "string", description: "Best matching category in format 'Broad: Subcategory'. Empty string if rejected." },
                  broad_category: { type: "string", description: "The broad category this falls under. Empty string if rejected." },
                  clarifying_note: { type: "string", description: "A short friendly note explaining what you understood. If rejected, this can be empty." },
                },
                required: ["rejected", "title", "description", "category", "broad_category", "clarifying_note"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "refine_request" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-refine-request error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
