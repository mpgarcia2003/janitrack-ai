import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in your environment."
  );
}

/**
 * Browser-side Supabase client. Honors the user's session (stored in
 * localStorage by default) and respects Row Level Security.
 *
 * NEVER import this from server code (api/*.ts) — those routes use the
 * service-role client which bypasses RLS.
 */
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_PROJECT_URL = supabaseUrl;
