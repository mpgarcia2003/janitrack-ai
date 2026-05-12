import { supabaseAdmin } from "./_supabase.js";

/**
 * Pull the caller's auth user + profile out of the Authorization header.
 * Returns `null` if there's no valid bearer token.
 */
export async function getCallerProfile(req) {
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) return null;

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, tenant_id, user_role, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  return profile ? { ...profile, email: profile.email ?? userData.user.email } : null;
}
