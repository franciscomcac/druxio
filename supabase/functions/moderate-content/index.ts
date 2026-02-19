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

    const systemPrompt = `You are a content moderation system for a freelance marketplace called Duxio.

Your ONLY job is to block content that is clearly harmful or violates these specific rules:

BLOCK these (hard violations):
- Sharing or requesting external contact platforms: Discord, Telegram, WhatsApp, Skype, Signal, WeChat, Line, Viber, Snapchat, Instagram DMs, Twitter/X DMs
- Sharing actual phone numbers (e.g. "+1 555 123 4567", "call me at...")
- Sharing personal email addresses for off-platform contact (e.g. "email me at john@gmail.com")
- Sexual or explicit content
- Hate speech, slurs, or threats
- Scams or phishing (e.g. "send me crypto first", "pay me outside the platform")
- Pure gibberish/random keyboard spam with no real meaning (e.g. "asdfghjkl", "aaaaaaaaaa", random characters)
- Drug requests or illegal services

ALWAYS ALLOW (never flag these):
- Saying "log in to your account" or "I'll access your account to deliver" — this is normal for gaming/boosting services
- "log in", "login", "sign in", "sign into" in any context related to service delivery
- Account delivery phrases like "I'll use your account credentials", "share your game credentials"
- Normal marketplace requests for any service (gaming, coding, design, writing, etc.)
- Frustration or informal language
- Gaming terms (rank, kills, boost, carry, farm, grind, etc.)
- Talking about delivering results or outcomes
- Any sentence that uses platform-sounding words in a non-contact context
- Short or unusual but genuine service messages

Be very lenient. Only flag what is clearly and unambiguously a violation. When in doubt, do NOT flag.

Context: ${context || "general marketplace content"}`;


    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s hard timeout

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze this content. Respond ONLY with valid JSON, nothing else.\n\nContent: "${text}"\n\nRespond with exactly: {"flagged": true or false, "reason": "reason if flagged or null"}`,
          },
        ],
        max_tokens: 100,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ flagged: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    try {
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({ flagged: !!result.flagged, reason: result.reason || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {}

    return new Response(JSON.stringify({ flagged: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ flagged: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
