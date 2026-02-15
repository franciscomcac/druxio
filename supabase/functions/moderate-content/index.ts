import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip very short texts
    if (text.trim().length < 3) {
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Fail open - don't block content if moderation is misconfigured
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a content moderation system for a freelance marketplace called Duxio. Your job is to detect inappropriate, low-quality, or harmful content.

Flag content that contains:
- Plain gibberish or random keyboard mashing (e.g. "asjdkfhaskjdf", "aaaaaaa", "test test test", meaningless letter combos)
- Spam or repetitive nonsense with no real intent
- Advertisements or self-promotion (e.g. "Buy cheap followers at...", "Visit my site for...")
- Sexual or explicit content
- Hate speech, slurs, or discrimination
- Threats of violence or self-harm
- Scams, phishing, or social engineering attempts
- Requests to move communication off-platform (sharing personal contact info like phone numbers, Discord, WhatsApp, Telegram, etc.)
- Drug-related requests or illegal activity
- Harassment or bullying

Do NOT flag:
- Normal marketplace requests (gaming boosting, coding help, design work, etc.)
- Mild frustration or informal language
- Gaming terminology (kills, headshots, etc.)
- Technical terms that might sound aggressive out of context
- Short but legitimate requests ("Need a logo", "Help me rank up")
- Informal/slang but clearly intentional messages
- Weird or unusual but genuine service requests

Context: ${context || "general marketplace content"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this content and respond with ONLY a JSON object. No other text.\n\nContent to analyze: "${text}"\n\nRespond with: {"flagged": true/false, "reason": "brief reason if flagged or null"}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "moderation_result",
              description: "Return the moderation result",
              parameters: {
                type: "object",
                properties: {
                  flagged: { type: "boolean", description: "Whether the content is inappropriate" },
                  reason: { type: "string", description: "Brief reason if flagged, null otherwise" },
                },
                required: ["flagged"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "moderation_result" } },
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      // Fail open
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({ flagged: !!result.flagged, reason: result.reason || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        // Parse error, fail open
      }
    }

    // Fallback: try parsing content directly
    const content = data.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({ flagged: !!result.flagged, reason: result.reason || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {}

    return new Response(
      JSON.stringify({ flagged: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ flagged: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
