import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROAD_CATEGORIES = [
  "Gaming", "Tech", "Business", "Creative", "Music", "Fitness", "Languages", "Content"
];

const SUBCATEGORIES: Record<string, string[]> = {
  Gaming: ["Valorant", "Fortnite", "Minecraft", "CS2", "Apex Legends", "League of Legends"],
  Tech: ["Discord Bots", "Web Development", "SEO", "Server Setup", "App Development", "WordPress"],
  Business: ["Marketing", "Startup Advice", "E-commerce", "Accounting"],
  Creative: ["Graphic Design", "Video Editing", "Ad Copy", "Thumbnails"],
  Music: ["Production", "Mixing & Mastering", "Guitar Lessons"],
  Fitness: ["Personal Training", "Nutrition Plans"],
  Languages: ["English", "Spanish"],
  Content: ["Streaming", "YouTube", "TikTok"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIdea } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const allCategories = Object.entries(SUBCATEGORIES).flatMap(([broad, subs]) =>
      subs.map(s => `${broad}: ${s}`)
    );

    const systemPrompt = `You are an assistant for Duxio, a marketplace where people post requests and experts respond with quotes.

Your job: Take the user's raw idea/need and refine it into a clear request. You should:
1. Understand their need deeply
2. Suggest a clear, concise title (max 80 chars)
3. Write a refined description (max 300 chars) that clarifies their need without changing their intent
4. Pick the best matching category from the available list, or suggest a custom one if none fit

Available categories: ${allCategories.join(", ")}

You must also pick the broad category from: ${BROAD_CATEGORIES.join(", ")}

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
              description: "Return a refined request with title, description, and category suggestions.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "A clear concise title for the request (max 80 chars)" },
                  description: { type: "string", description: "A refined description that clarifies the user's need (max 300 chars)" },
                  category: { type: "string", description: "Best matching category in format 'Broad: Subcategory' e.g. 'Tech: Web Development'. Can be custom if none fit." },
                  broad_category: { type: "string", description: "The broad category this falls under" },
                  clarifying_note: { type: "string", description: "A short friendly note (1-2 sentences) explaining what you understood and any clarifications you made" },
                },
                required: ["title", "description", "category", "broad_category", "clarifying_note"],
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
