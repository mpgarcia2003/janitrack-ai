// deno-lint-ignore-file no-explicit-any
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
 * Look up the public QR token and return ONLY the fields the unauthenticated
 * client legitimately needs. Never returns the full entity, never returns
 * other tenants' data. Used by:
 *   - ScanCheckIn (tokenType: "area")
 *   - FeedbackQR (tokenType: "area" for area feedback, "facility-feedback" for facility feedback)
 *   - InventoryAccess (tokenType: "inventory")
 *   - NewProjectQR uses validateProjectToken instead (kept separate for legacy reasons)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const { token, tokenType } = await req.json().catch(() => ({}));

    if (!token || typeof token !== "string") {
      return json({ error: "Token required" }, { status: 400 });
    }

    switch (tokenType) {
      case "area": {
        const areas = await base44.asServiceRole.entities.Area.filter({ qr_token: token });
        const area = areas?.[0];
        if (!area) return json({ error: "Invalid QR code" }, { status: 404 });

        const clients = await base44.asServiceRole.entities.Client.filter({ id: area.client_id });
        const client = clients?.[0] ?? null;

        return json({
          area: {
            id: area.id,
            name: area.name,
            location_desc: area.location_desc,
            client_id: area.client_id,
            tenant_id: area.tenant_id,
          },
          client: client ? { id: client.id, name: client.name, code: client.code } : null,
        });
      }

      case "project": {
        const clients = await base44.asServiceRole.entities.Client.filter({ project_qr_token: token });
        const client = clients?.[0];
        if (!client) return json({ error: "Invalid QR code" }, { status: 404 });
        return json({
          client: { id: client.id, name: client.name, code: client.code, tenant_id: client.tenant_id },
        });
      }

      case "facility-feedback": {
        const clients = await base44.asServiceRole.entities.Client.filter({ feedback_qr_token: token });
        const client = clients?.[0];
        if (!client) return json({ error: "Invalid QR code" }, { status: 404 });
        return json({
          client: { id: client.id, name: client.name, code: client.code, tenant_id: client.tenant_id },
        });
      }

      case "inventory": {
        const clients = await base44.asServiceRole.entities.Client.filter({ inventory_qr_token: token });
        const client = clients?.[0];
        if (!client) return json({ error: "Invalid QR code" }, { status: 404 });
        return json({
          client: { id: client.id, name: client.name, code: client.code, tenant_id: client.tenant_id },
        });
      }

      default:
        return json({ error: `Invalid token type: ${tokenType}` }, { status: 400 });
    }
  } catch (error) {
    console.error("validateQRToken error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
