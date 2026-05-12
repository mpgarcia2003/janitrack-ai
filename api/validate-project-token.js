import { supabaseAdmin, json, handlePreflight } from "./_supabase.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") {
      return json({ error: "Token required" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name, tenant_id")
      .eq("project_qr_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Invalid project token" }, { status: 404 });
    return json({ client: data });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("validate-project-token error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
