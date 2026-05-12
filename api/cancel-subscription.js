import Stripe from "stripe";
import { supabaseAdmin, json, handlePreflight } from "./_supabase.js";
import { getCallerProfile } from "./_auth.js";

export const config = { runtime: "nodejs" };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    const profile = await getCallerProfile(req);
    if (!profile) return json({ error: "Unauthorized" }, { status: 401 });
    if (!profile.tenant_id) return json({ error: "Tenant required" }, { status: 403 });

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, stripe_subscription_id")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) {
      return json({ error: "No active subscription found" }, { status: 404 });
    }

    await stripe.subscriptions.cancel(sub.stripe_subscription_id);

    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", sub.id);

    return json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("cancel-subscription error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
