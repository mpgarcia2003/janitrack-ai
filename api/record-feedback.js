import { supabaseAdmin, json, handlePreflight } from "./_supabase.js";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    const body = await req.json().catch(() => ({}));
    const { token, scope, rating, comment, submitted_by_name, submitted_by_email } = body;

    if (!token || typeof token !== "string") return json({ error: "Token required" }, { status: 400 });
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return json({ error: "Rating must be an integer 1-5" }, { status: 400 });
    }

    let tenant_id = null;
    let client_id = null;
    let area_id = null;

    if (scope === "facility-feedback" || scope === "facility") {
      const { data: client, error } = await supabaseAdmin
        .from("clients")
        .select("id, tenant_id")
        .eq("feedback_qr_token", token)
        .maybeSingle();
      if (error) throw error;
      if (!client) return json({ error: "Invalid feedback QR" }, { status: 404 });
      tenant_id = client.tenant_id;
      client_id = client.id;
    } else {
      const { data: area, error } = await supabaseAdmin
        .from("areas")
        .select("id, tenant_id, client_id")
        .eq("qr_token", token)
        .maybeSingle();
      if (error) throw error;
      if (!area) return json({ error: "Invalid feedback QR" }, { status: 404 });
      tenant_id = area.tenant_id;
      client_id = area.client_id;
      area_id = area.id;
    }

    const { data: row, error: insertError } = await supabaseAdmin
      .from("feedback")
      .insert({
        tenant_id,
        client_id,
        area_id,
        rating: numericRating,
        comment: comment ? String(comment).slice(0, 2000) : "",
        submitted_by_name: submitted_by_name ? String(submitted_by_name).slice(0, 200) : null,
        submitted_by_email: submitted_by_email ? String(submitted_by_email).slice(0, 200) : null,
        ip_address:
          req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
        user_agent: req.headers.get("user-agent") ?? "unknown",
        feedback_timestamp: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    return json({ success: true, feedback_id: row.id });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("record-feedback error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
