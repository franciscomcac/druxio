import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    // Fetch session and messages
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*, messages(*)")
      .eq("id", sessionId)
      .single();

    if (sessionError) throw sessionError;

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format messages for AI
    const messageHistory = session.messages
      ?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      ?.map((m: any) => `[${new Date(m.created_at).toLocaleTimeString()}] ${m.sender_id === session.mentee_id ? 'Mentee' : 'Mentor'}: ${m.content}`)
      ?.join("\n") || "No messages yet";

    const prompt = `Analyze this mentorship session and create a concise summary.

SESSION DETAILS:
- Categories: ${session.categories?.join(", ") || "Not specified"}
- Issue: ${session.issue_description || "Not specified"}
- Duration: ${session.duration_minutes || 0} minutes
- Status: ${session.status}

MESSAGE HISTORY:
${messageHistory}

Create a summary with:
1. Key Problem: What was the main issue discussed?
2. Solution: What solution or approach was provided?
3. Key Takeaways: 2-3 bullet points of important learnings
4. Next Steps: Suggested follow-up actions (if any)

Format as JSON:
{
  "keyProblem": "...",
  "solution": "...",
  "keyTakeaways": ["...", "..."],
  "nextSteps": ["...", "..."]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a session summarization AI. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI service unavailable");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    // Parse the summary
    let summary;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        summary = { keyProblem: content, solution: "", keyTakeaways: [], nextSteps: [] };
      }
    } catch {
      summary = { keyProblem: content, solution: "", keyTakeaways: [], nextSteps: [] };
    }

    // Optionally save to session notes
    await supabase
      .from("sessions")
      .update({ notes: JSON.stringify(summary) })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Session summary error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
