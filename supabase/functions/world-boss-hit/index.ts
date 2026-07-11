import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return json(401, { error: "missing_authorization" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "server_configuration_error" });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await service.auth.getUser(match[1]);
  if (authError || !authData.user) return json(401, { error: "invalid_token" });

  let payload: unknown;
  try { payload = await request.json(); }
  catch { return json(400, { error: "invalid_json" }); }

  const body = payload as { eventId?: unknown; hitToken?: unknown; damage?: unknown };
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const hitToken = typeof body.hitToken === "string" ? body.hitToken : "";
  const damage = typeof body.damage === "number" ? body.damage : Number.NaN;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const tokenPattern = /^[A-Za-z0-9._:-]{16,128}$/;
  if (!uuidPattern.test(eventId) || !tokenPattern.test(hitToken) || !Number.isSafeInteger(damage) || damage < 1 || damage > 50000) {
    return json(400, { error: "invalid_hit_payload" });
  }

  const { data, error } = await service.rpc("record_world_boss_hit", {
    p_user_id: authData.user.id,
    p_event_id: eventId,
    p_hit_token: hitToken,
    p_damage: damage,
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("rate limit")) return json(429, { error: "rate_limited" });
    if (message.includes("not active")) return json(409, { error: "event_not_active" });
    if (message.includes("not found")) return json(404, { error: "event_not_found" });
    return json(400, { error: "hit_rejected" });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return json(200, {
    remainingHp: result?.remaining_hp ?? null,
    acceptedDamage: result?.accepted_damage ?? 0,
    defeated: Boolean(result?.defeated),
  });
});
