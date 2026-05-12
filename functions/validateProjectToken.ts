// deno-lint-ignore-file no-explicit-any
import { createClientFromRequest } from "npm:@base44/sdk@0.8.27";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") {
      return Response.json({ error: "Token required" }, { status: 400, headers: CORS });
    }

    const base44 = createClientFromRequest(req);
    const clients = await base44.asServiceRole.entities.Client.filter({ project_qr_token: token });
    const client = clients?.[0];
    if (!client) {
      return Response.json({ error: "Invalid project token" }, { status: 404, headers: CORS });
    }

    return Response.json(
      { client: { id: client.id, name: client.name, tenant_id: client.tenant_id } },
      { headers: CORS }
    );
  } catch (error: any) {
    console.error("validateProjectToken error:", error?.message ?? error);
    return Response.json({ error: error?.message ?? "Internal error" }, { status: 500, headers: CORS });
  }
});
