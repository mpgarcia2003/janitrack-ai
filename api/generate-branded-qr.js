import { supabaseAdmin, handlePreflight } from "./_supabase.js";

export const config = { runtime: "edge" };

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value) =>
  value == null ? "" : String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

const safeUrl = (raw) => {
  if (!raw) return "";
  try {
    const url = new URL(String(raw));
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

const safeColor = (raw, fallback) =>
  typeof raw === "string" && /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw.trim())
    ? raw.trim()
    : fallback;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const errorResponse = (msg, status = 500) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) return errorResponse("Unauthorized", 401);

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData?.user) return errorResponse("Unauthorized", 401);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile?.tenant_id) return errorResponse("Tenant required", 403);

    const body = await req.json().catch(() => ({}));
    const { url, qrType, clientName, areaName } = body;
    const printedUrl = safeUrl(url);
    if (!printedUrl) return errorResponse("Invalid url", 400);

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name, tagline, contact_name, contact_email, brand_color, company_name_color, logo_url")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (!tenant) return errorResponse("Tenant not found", 404);

    const qrConfig = {
      cleaning: { title: "CLEANING CHECK-IN", instruction: "Scan the QR code below to check in when cleaning this area." },
      "facility-feedback": { title: "FACILITY FEEDBACK", instruction: "Scan the QR code below to share your feedback about our facility." },
      "area-feedback": { title: `${escapeHtml(areaName?.toUpperCase() ?? "AREA")} FEEDBACK`, instruction: "Scan the QR code below to rate the cleanliness of this area." },
      project: { title: "PROJECT SUBMISSION", instruction: "Scan the QR code below to report maintenance issues or request work." },
      inventory: { title: "INVENTORY MANAGEMENT", instruction: "Scan the QR code below to access inventory for this location." },
    };
    const config = qrConfig[qrType] ?? qrConfig["facility-feedback"];

    const brandColor = safeColor(tenant.brand_color, "#1B7A3D");
    const nameColor = safeColor(tenant.company_name_color, "#000000");
    const logoUrl = safeUrl(tenant.logo_url);
    const safeClientName = escapeHtml(clientName);
    const safeTenantName = escapeHtml(tenant.name);
    const safeContactName = escapeHtml(tenant.contact_name);
    const safeContactEmail = escapeHtml(tenant.contact_email);
    const safeTagline = escapeHtml(tenant.tagline);

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>JaniTrack Branded QR</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
@page { margin:0.5in; size:letter portrait; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; background:white; width:100%; padding:40px 60px; text-align:center; }
.container { max-width:700px; margin:0 auto; }
.client-name { font-size:44px; font-weight:900; letter-spacing:1px; margin-bottom:12px; text-transform:uppercase; color:#000; line-height:1.1; }
.qr-title { font-size:48px; font-weight:900; letter-spacing:2px; margin-bottom:18px; text-transform:uppercase; color:#000; line-height:1.1; }
.separator { width:100%; height:8px; background:${brandColor}; margin:20px auto; border-radius:4px; }
.instructions { font-size:20px; line-height:1.5; margin:25px auto; max-width:600px; color:#333; }
.qr-container { margin:35px auto; display:flex; justify-content:center; }
.qr-container img { width:400px; height:400px; }
.contact { font-size:18px; margin:30px auto; color:#444; }
.company-row { display:flex; align-items:center; justify-content:center; gap:18px; margin-bottom:12px; }
.company-logo { max-height:70px; max-width:140px; object-fit:contain; }
.company-name { font-size:42px; font-weight:900; color:${nameColor}; text-transform:uppercase; letter-spacing:1px; line-height:1.1; }
.tagline { font-size:16px; font-style:italic; color:#666; margin-top:10px; }
@media print { body { padding:30px 50px; } .client-name { font-size:42px; } .qr-title { font-size:46px; } .qr-container img { width:380px; height:380px; } .company-name { font-size:40px; } }
</style></head>
<body><div class="container">
${safeClientName ? `<div class="client-name">${safeClientName.toUpperCase()}</div>` : ""}
<div class="qr-title">${config.title}</div>
<div class="separator"></div>
<div class="instructions">${config.instruction}</div>
<div class="qr-container"><img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(printedUrl)}" alt="QR Code"></div>
${safeContactName || safeContactEmail ? `<div class="contact">Questions? ${safeContactName}${safeContactName && safeContactEmail ? " &bull; " : ""}${safeContactEmail}</div>` : ""}
<div class="company-row">
${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="company-logo">` : ""}
<div class="company-name">${safeTenantName}</div>
</div>
${safeTagline ? `<div class="tagline">${safeTagline}</div>` : ""}
</div></body></html>`;

    return new Response(JSON.stringify({ html }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("generate-branded-qr error:", error?.message ?? error);
    return errorResponse(error?.message ?? "Internal error", 500);
  }
}
