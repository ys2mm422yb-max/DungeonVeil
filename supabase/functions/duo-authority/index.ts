import { createClient } from "supabase";
import { executeDuoAuthority, type DuoAuthorityBody } from "./service.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  if (!token) return json(401, { error: "missing_authorization" });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(500, { error: "server_configuration_error" });
  let body: DuoAuthorityBody;
  try { body = await request.json(); }
  catch { return json(400, { error: "invalid_json" }); }
  try {
    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    return json(200, await executeDuoAuthority(service, token, body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "authority_rejected";
    if (message === "invalid_token") return json(401, { error: message });
    if (message.includes("not_found")) return json(404, { error: message });
    if (message.includes("conflict") || message.includes("gap") || message.includes("replay")) return json(409, { error: message });
    return json(400, { error: message.split(":", 1)[0] });
  }
});
