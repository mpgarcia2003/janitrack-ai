import { supabaseAdmin, json, handlePreflight } from "./_supabase.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
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

    const { data: area, error: areaError } = await supabaseAdmin
      .from("areas")
      .select("id, tenant_id, client_id")
      .eq("qr_token", token)
      .maybeSingle();
    if (areaError) throw areaError;
    if (!area) return json({ error: "Invalid QR code" }, { status: 404 });

    const nowIso = new Date().toISOString();
    const { data: event, error: insertError } = await supabaseAdmin
      .from("cleaning_events")
      .insert({
        tenant_id: area.tenant_id,
        client_id: area.client_id,
        area_id: area.id,
        cleaner_name: String(cleaner_name).slice(0, 200),
        notes: notes ? String(notes).slice(0, 2000) : "",
        photo_url: photo_url ?? null,
        server_timestamp: nowIso,
        device_timestamp: device_timestamp || nowIso,
        timezone: timezone || "America/New_York",
        ip_address:
          req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
        user_agent: req.headers.get("user-agent") ?? "unknown",
        latitude: typeof latitude === "number" ? latitude : null,
        longitude: typeof longitude === "number" ? longitude : null,
        location_accuracy: typeof location_accuracy === "number" ? location_accuracy : null,
        status: "completed",
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    await supabaseAdmin
      .from("areas")
      .update({ last_cleaned_at: nowIso })
      .eq("id", area.id);

    return json({ success: true, event_id: event.id });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("record-check-in error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
