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
    const { categories, issueDescription, limit = 10 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    // Fetch all mentors with their profiles
    const { data: mentorRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "mentor");

    if (rolesError) throw rolesError;

    if (!mentorRoles || mentorRoles.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "No mentors available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mentorIds = mentorRoles.map(r => r.user_id);

    const { data: mentors, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, bio, skills, rating_avg, total_sessions, hourly_rate, is_online")
      .in("id", mentorIds);

    if (profilesError) throw profilesError;

    if (!mentors || mentors.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], message: "No mentor profiles found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the AI prompt for matching
    const mentorList = mentors.map((m, i) => 
      `${i + 1}. ID: ${m.id}
   Name: ${m.display_name || "Anonymous"}
   Skills: ${m.skills?.join(", ") || "Not specified"}
   Bio: ${m.bio || "No bio"}
   Rating: ${m.rating_avg || 0}/5
   Sessions: ${m.total_sessions || 0}
   Rate: $${m.hourly_rate || 2.50}/10min
   Online: ${m.is_online ? "Yes" : "No"}`
    ).join("\n\n");

    const prompt = `You are an AI mentor matching system. Analyze the user's needs and score each mentor on a scale of 0-100 based on relevance.

USER REQUEST:
Categories: ${categories?.join(", ") || "Not specified"}
Issue Description: ${issueDescription || "General help needed"}

AVAILABLE MENTORS:
${mentorList}

Score each mentor based on:
1. Skill match with requested categories (40%)
2. Relevance of their bio/expertise to the issue (30%)
3. Rating and experience (20%)
4. Online status (10% bonus if online)

Return a JSON array of the top ${limit} matches in this exact format:
[
  {"mentor_id": "uuid", "score": 95, "reason": "Brief reason for match"},
  ...
]

Only return the JSON array, no other text.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a precise mentor matching AI. Always respond with valid JSON arrays only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Fallback: return mentors sorted by rating
      const fallbackMatches = mentors
        .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
        .slice(0, limit)
        .map((m, i) => ({
          mentor_id: m.id,
          score: 100 - (i * 5),
          reason: "Matched by rating and experience",
          mentor: m,
        }));
      
      return new Response(
        JSON.stringify({ matches: fallbackMatches, fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    // Parse AI response
    let matches = [];
    try {
      // Extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback to simple matching
      matches = mentors
        .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
        .slice(0, limit)
        .map((m, i) => ({
          mentor_id: m.id,
          score: 100 - (i * 5),
          reason: "Matched by rating",
        }));
    }

    // Enrich matches with mentor data
    const enrichedMatches = matches.map((match: any) => {
      const mentor = mentors.find(m => m.id === match.mentor_id);
      return {
        ...match,
        mentor,
      };
    }).filter((m: any) => m.mentor); // Remove any matches without valid mentors

    return new Response(
      JSON.stringify({ matches: enrichedMatches }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("AI matching error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
