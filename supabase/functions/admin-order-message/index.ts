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
    const { jobId, message } = await req.json();

    if (!jobId || !message?.trim()) {
      return new Response(JSON.stringify({ error: "jobId and message are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the session for this job
    const { data: job } = await adminClient
      .from("jobs")
      .select("buyer_id")
      .eq("id", jobId)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: quote } = await adminClient
      .from("quotes")
      .select("expert_id")
      .eq("job_id", jobId)
      .eq("status", "accepted")
      .maybeSingle();

    if (!quote) {
      return new Response(JSON.stringify({ error: "No accepted quote found for this job" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find session
    const { data: session } = await adminClient
      .from("sessions")
      .select("id")
      .eq("mentee_id", job.buyer_id)
      .eq("mentor_id", quote.expert_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: "No chat session found for this order" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the admin message using service role (bypasses RLS)
    const { error: insertError } = await adminClient.from("messages").insert({
      session_id: session.id,
      sender_id: user.id,
      content: `🛡️ ADMIN: ${message.trim()}`,
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("admin-order-message error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
