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

const ALLOWED_PRIORITY = new Set(["low", "medium", "high", "urgent"]);

/**
 * Public project / work-request submission from a client-side QR scan. The
 * caller passes only the project QR token plus their form data; tenant_id and
 * client_id are resolved from the token. Body-supplied IDs are ignored.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const {
      token,
      title,
      description,
      priority,
      submitted_by_name,
      submitted_by_email,
      file_urls,
    } = body;

    if (!token || typeof token !== "string") return json({ error: "Token required" }, { status: 400 });
    if (!title || typeof title !== "string") return json({ error: "Title required" }, { status: 400 });

    const clients = await base44.asServiceRole.entities.Client.filter({ project_qr_token: token });
    const client = clients?.[0];
    if (!client) return json({ error: "Invalid project QR" }, { status: 404 });

    const safePriority = ALLOWED_PRIORITY.has(priority) ? priority : "medium";
    const submitterTag =
      submitted_by_name || submitted_by_email
        ? `\n\nSubmitted by: ${submitted_by_name ?? "anonymous"}${submitted_by_email ? ` <${submitted_by_email}>` : ""}`
        : "";

    const project = await base44.asServiceRole.entities.Project.create({
      tenant_id: client.tenant_id,
      client_id: client.id,
      title: String(title).slice(0, 200),
      description: `${description ? String(description).slice(0, 4000) : ""}${submitterTag}`.trim(),
      status: "open",
      priority: safePriority,
      file_urls: Array.isArray(file_urls) ? file_urls.slice(0, 10) : undefined,
      assigned_to_name: submitted_by_name ? String(submitted_by_name).slice(0, 200) : "Public Submission",
    });

    return json({ success: true, project_id: project.id });
  } catch (error) {
    console.error("createWorkRequest error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
