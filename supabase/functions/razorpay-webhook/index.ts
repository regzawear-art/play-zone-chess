import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifySignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    const valid = await verifySignature(rawBody, signature, webhookSecret);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event.event;
    const payload = event.payload?.subscription?.entity;
    const paymentPayload = event.payload?.payment?.entity;

    if (!payload) {
      return new Response(
        JSON.stringify({ error: "No subscription entity in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subscriptionId: string = payload.id;
    const notes = payload.notes ?? {};
    const userId: string | undefined = notes.user_id;
    const planId: string | undefined = notes.plan_id ?? payload.plan_id;

    let status: "active" | "expired" | "cancelled" = "active";
    const activated = ["subscription.activated", "subscription.charged"];
    const expired = ["subscription.halted", "subscription.completed"];
    const cancelled = ["subscription.cancelled"];

    if (activated.includes(eventType)) {
      status = "active";
    } else if (expired.includes(eventType)) {
      status = "expired";
    } else if (cancelled.includes(eventType)) {
      status = "cancelled";
    } else {
      return new Response(
        JSON.stringify({ received: true, ignored: eventType }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const currentEnd: number | undefined =
      payload.current_end ?? paymentPayload?.created_at * 1000;
    const expiresAt = currentEnd
      ? new Date(currentEnd * 1000).toISOString()
      : null;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const upsertBody: Record<string, unknown> = {
      razorpay_subscription_id: subscriptionId,
      status,
    };
    if (expiresAt) upsertBody.expires_at = expiresAt;
    if (userId) upsertBody.user_id = userId;
    if (planId) upsertBody.plan_id = planId;

    if (status === "active" && (eventType === "subscription.activated" || eventType === "subscription.charged")) {
      upsertBody.started_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("subscriptions")
      .upsert(upsertBody, { onConflict: "razorpay_subscription_id" });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ received: true, status, subscription_id: subscriptionId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
