import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAN_MAP: Record<string, { plan_id: string; total_count: number }> = {
  monthly: { plan_id: "plan_U1cJUP26DE0ohp", total_count: 120 },
  yearly: { plan_id: "plan_U1cJzNwTYmIXON", total_count: 10 },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!keyId || !keySecret || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "You must be logged in to subscribe." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const planKey: string = body.plan;
    const planConfig = PLAN_MAP[planKey];

    if (!planConfig) {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Use 'monthly' or 'yearly'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rzpBody = {
      plan_id: planConfig.plan_id,
      total_count: planConfig.total_count,
      quantity: 1,
      customer_notify: 1,
      notes: {
        user_id: user.id,
        plan_id: planConfig.plan_id,
      },
    };

    const rzpRes = await fetch(
      "https://api.razorpay.com/v1/subscriptions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        },
        body: JSON.stringify(rzpBody),
      },
    );

    const rzpData = await rzpRes.json();

    if (!rzpRes.ok || !rzpData.id) {
      return new Response(
        JSON.stringify({
          error: rzpData.error?.description ?? "Failed to create subscription.",
        }),
        {
          status: rzpRes.status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        subscription_id: rzpData.id,
        key_id: keyId,
        status: rzpData.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
