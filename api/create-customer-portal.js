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
      .select("stripe_customer_id")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (!sub?.stripe_customer_id) {
      return json({ error: "No customer found" }, { status: 404 });
    }

    const origin = req.headers.get("origin") ?? "";
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/Billing`,
    });
    return json({ url: session.url });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("create-customer-portal error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
