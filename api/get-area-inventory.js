import { supabaseAdmin, json, handlePreflight } from "./_supabase.js";

export const config = { runtime: "edge" };

const computeStatus = (item) => {
  if (item.reorder_point != null && item.on_hand <= item.reorder_point) return "critical";
  if (item.par_level != null && item.on_hand < item.par_level) return "low";
  return "good";
};

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return json({ error: "Token required" }, { status: 400 });

    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, name, code")
      .eq("inventory_qr_token", token)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) return json({ error: "Invalid inventory QR" }, { status: 404 });

    const { data: inventory, error: invError } = await supabaseAdmin
      .from("inventory_items")
      .select("id, name, sku, category, unit, on_hand, par_level, reorder_point")
      .eq("client_id", client.id)
      .eq("active", true);
    if (invError) throw invError;

    return json({
      success: true,
      client,
      items: (inventory ?? []).map((item) => ({ ...item, status: computeStatus(item) })),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("get-area-inventory error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
