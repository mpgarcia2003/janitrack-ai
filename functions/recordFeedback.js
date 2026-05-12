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
 * Public feedback submission. Accepts either:
 *   - { token, scope: "area", rating, comment?, name?, email? }   for an area-level rating
 *   - { token, scope: "facility", rating, comment?, name?, email? } for a facility-level rating
 *
 * The server resolves tenant_id, client_id, and area_id (if applicable) from
 * the validated token. Body-supplied IDs are ignored.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
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

    if (scope === "facility") {
      const clients = await base44.asServiceRole.entities.Client.filter({ feedback_qr_token: token });
      const client = clients?.[0];
      if (!client) return json({ error: "Invalid feedback QR" }, { status: 404 });
      tenant_id = client.tenant_id;
      client_id = client.id;
    } else if (scope === "area" || !scope) {
      const areas = await base44.asServiceRole.entities.Area.filter({ qr_token: token });
      const area = areas?.[0];
      if (!area) return json({ error: "Invalid feedback QR" }, { status: 404 });
      tenant_id = area.tenant_id;
      client_id = area.client_id;
      area_id = area.id;
    } else {
      return json({ error: `Invalid scope: ${scope}` }, { status: 400 });
    }

    const feedback = await base44.asServiceRole.entities.Feedback.create({
      tenant_id,
      client_id,
      area_id,
      rating: numericRating,
      comment: comment ? String(comment).slice(0, 2000) : "",
      submitted_by_name: submitted_by_name ? String(submitted_by_name).slice(0, 200) : null,
      submitted_by_email: submitted_by_email ? String(submitted_by_email).slice(0, 200) : null,
      ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "unknown",
      feedback_timestamp: new Date().toISOString(),
    });

    return json({ success: true, feedback_id: feedback.id });
  } catch (error) {
    console.error("recordFeedback error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
