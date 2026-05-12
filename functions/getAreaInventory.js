/* global Deno */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.27";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...CORS, ...(init.headers || {}) },
  });

/**
 * Returns the inventory items for the client whose `inventory_qr_token`
 * matches the caller's token. The caller never names the client_id — it's
 * derived from the validated token.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json().catch(() => ({}));

    if (!token || typeof token !== "string") return json({ error: "Token required" }, { status: 400 });

    const clients = await base44.asServiceRole.entities.Client.filter({ inventory_qr_token: token });
    const client = clients?.[0];
    if (!client) return json({ error: "Invalid inventory QR" }, { status: 404 });

    const inventory = await base44.asServiceRole.entities.InventoryItem.filter({
      client_id: client.id,
      active: true,
    });

    return json({
      success: true,
      client: { id: client.id, name: client.name, code: client.code },
      items: (inventory ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        on_hand: item.on_hand,
        par_level: item.par_level,
        reorder_point: item.reorder_point,
        status:
          item.reorder_point && item.on_hand <= item.reorder_point
            ? "critical"
            : item.par_level && item.on_hand < item.par_level
            ? "low"
            : "good",
      })),
    });
  } catch (error) {
    console.error("getAreaInventory error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
