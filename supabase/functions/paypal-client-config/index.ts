const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID") || Deno.env.get("VITE_PAYPAL_CLIENT_ID");

    if (!clientId) {
      return new Response(JSON.stringify({ error: "PAYPAL_CLIENT_ID is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mode = Deno.env.get("PAYPAL_MODE") === "live" ? "live" : "sandbox";

    return new Response(JSON.stringify({ clientId, mode }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paypal-client-config error:", err);

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
