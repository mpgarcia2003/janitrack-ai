import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  // eslint-disable-next-line no-console
  console.error(
    "[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var. " +
      "API routes will not work."
  );
}

/**
 * Server-only Supabase client. Uses the service role key, which bypasses RLS.
 * NEVER expose this to the browser — keep it in API routes only.
 */
export const supabaseAdmin = createClient(supabaseUrl ?? "", serviceRoleKey ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...(init.headers ?? {}),
    },
  });

export const handlePreflight = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
