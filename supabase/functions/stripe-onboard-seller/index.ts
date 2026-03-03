import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { return_url, refresh_url } = await req.json();

    // Check if user already has a Stripe Connect account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_id")
      .eq("id", userId)
      .single();

    let accountId = profile?.stripe_connect_id;

    if (!accountId) {
      // Get user email
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: userData } = await adminClient.auth.admin.getUserById(userId);
      const email = userData?.user?.email;

      // Create a new Connect Express account
      const account = await stripe.accounts.create({
        type: "express",
        email: email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { user_id: userId },
      });
      accountId = account.id;

      // Save to profile using service role (user can only update own profile but stripe_connect_id should be set)
      await adminClient
        .from("profiles")
        .update({ stripe_connect_id: accountId })
        .eq("id", userId);
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refresh_url || "https://druxio.lovable.app/wallet",
      return_url: return_url || "https://druxio.lovable.app/wallet",
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("stripe-onboard-seller error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
