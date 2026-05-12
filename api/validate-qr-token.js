import { supabaseAdmin, json, handlePreflight } from "./_supabase.js";

export const config = { runtime: "edge" };

const TOKEN_HANDLERS = {
  area: async (token) => {
    const { data, error } = await supabaseAdmin
      .from("areas")
      .select("id, name, location_desc, client_id, tenant_id")
      .eq("qr_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, name, code")
      .eq("id", data.client_id)
      .maybeSingle();
    return { area: data, client };
  },
  project: async (token) => {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name, code, tenant_id")
      .eq("project_qr_token", token)
      .maybeSingle();
    if (error) throw error;
    return data ? { client: data } : null;
  },
  "facility-feedback": async (token) => {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name, code, tenant_id")
      .eq("feedback_qr_token", token)
      .maybeSingle();
    if (error) throw error;
    return data ? { client: data } : null;
  },
  inventory: async (token) => {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name, code, tenant_id")
      .eq("inventory_qr_token", token)
      .maybeSingle();
    if (error) throw error;
    return data ? { client: data } : null;
  },
};

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    const { token, tokenType } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return json({ error: "Token required" }, { status: 400 });

    const lookup = TOKEN_HANDLERS[tokenType];
    if (!lookup) return json({ error: `Invalid token type: ${tokenType}` }, { status: 400 });

    const result = await lookup(token);
    if (!result) return json({ error: "Invalid QR code" }, { status: 404 });
    return json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("validate-qr-token error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
