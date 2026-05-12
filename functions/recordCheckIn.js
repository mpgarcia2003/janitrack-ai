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
 * Public cleaning check-in. The CALLER provides only the QR token plus their
 * own form data — the server derives tenant_id / client_id / area_id from the
 * area the token resolves to. This prevents cross-tenant writes.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const {
      token,
      cleaner_name,
      notes,
      photo_url,
      device_timestamp,
      timezone,
      latitude,
      longitude,
      location_accuracy,
    } = body;

    if (!token || typeof token !== "string") return json({ error: "Token required" }, { status: 400 });
    if (!cleaner_name || typeof cleaner_name !== "string") {
      return json({ error: "cleaner_name required" }, { status: 400 });
    }

    // Resolve area by qr_token — single indexed lookup, single tenant
    const areas = await base44.asServiceRole.entities.Area.filter({ qr_token: token });
    const area = areas?.[0];
    if (!area) return json({ error: "Invalid QR code" }, { status: 404 });

    const nowIso = new Date().toISOString();
    const event = await base44.asServiceRole.entities.CleaningEvent.create({
      tenant_id: area.tenant_id,
      client_id: area.client_id,
      area_id: area.id,
      cleaner_name: String(cleaner_name).slice(0, 200),
      notes: notes ? String(notes).slice(0, 2000) : "",
      photo_url: photo_url ?? null,
      server_timestamp: nowIso,
      device_timestamp: device_timestamp || nowIso,
      timezone: timezone || "America/New_York",
      ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "unknown",
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
      location_accuracy: typeof location_accuracy === "number" ? location_accuracy : null,
      status: "completed",
    });

    await base44.asServiceRole.entities.Area.update(area.id, { last_cleaned_at: nowIso });

    return json({ success: true, event_id: event.id });
  } catch (error) {
    console.error("recordCheckIn error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
