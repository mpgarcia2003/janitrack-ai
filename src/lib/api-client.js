import { supabase } from "@/lib/supabase";

/**
 * Call one of our Vercel API routes. Mirrors the shape we had with
 * base44.functions.invoke so existing pages don't have to change much.
 *
 * Authenticated routes receive the Supabase access token automatically;
 * public routes (the QR endpoints) ignore the header server-side.
 */
export async function apiInvoke(name, body = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

  const response = await fetch(`/api/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error ?? `Request to /api/${name} failed (${response.status})`);
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  // Match the base44 SDK shape used throughout the codebase: { data: { ... } }
  return { data: payload };
}
