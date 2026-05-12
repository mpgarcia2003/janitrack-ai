import { supabaseAdmin, json, handlePreflight } from "./_supabase.js";

export const config = { runtime: "edge" };

const ALLOWED_PRIORITY = new Set(["low", "medium", "high", "urgent"]);

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
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

    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, tenant_id")
      .eq("project_qr_token", token)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) return json({ error: "Invalid project QR" }, { status: 404 });

    const safePriority = ALLOWED_PRIORITY.has(priority) ? priority : "medium";
    const submitterTag =
      submitted_by_name || submitted_by_email
        ? `\n\nSubmitted by: ${submitted_by_name ?? "anonymous"}${submitted_by_email ? ` <${submitted_by_email}>` : ""}`
        : "";

    const { data: project, error: insertError } = await supabaseAdmin
      .from("projects")
      .insert({
        tenant_id: client.tenant_id,
        client_id: client.id,
        title: String(title).slice(0, 200),
        description: `${description ? String(description).slice(0, 4000) : ""}${submitterTag}`.trim(),
        status: "open",
        priority: safePriority,
        file_urls: Array.isArray(file_urls) ? file_urls.slice(0, 10) : null,
        assigned_to_name: submitted_by_name
          ? String(submitted_by_name).slice(0, 200)
          : "Public Submission",
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    return json({ success: true, project_id: project.id });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("create-work-request error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
