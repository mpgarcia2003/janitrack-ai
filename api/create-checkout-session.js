import Stripe from "stripe";
import { supabaseAdmin, json, handlePreflight } from "./_supabase.js";
import { getCallerProfile } from "./_auth.js";

// Node runtime is required because the Stripe SDK needs Node APIs.
export const config = { runtime: "nodejs" };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export default async function handler(req) {
  if (req.method === "OPTIONS") return handlePreflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  try {
    const profile = await getCallerProfile(req);
    if (!profile) return json({ error: "Unauthorized" }, { status: 401 });
    if (!profile.tenant_id) return json({ error: "Tenant required" }, { status: 403 });

    const { plan_id, billing_cycle } = await req.json().catch(() => ({}));
    if (!plan_id) return json({ error: "plan_id required" }, { status: 400 });

    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, stripe_price_id_monthly, stripe_price_id_yearly")
      .eq("id", plan_id)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan) return json({ error: "Plan not found" }, { status: 404 });

    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: { tenant_id: profile.tenant_id, user_id: profile.id },
      });
      customerId = customer.id;
    }

    const priceId =
      billing_cycle === "yearly" ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;
    if (!priceId) {
      return json(
        { error: `Plan is missing a stripe_price_id for ${billing_cycle ?? "monthly"}` },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") ?? "";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/Billing?success=true`,
      cancel_url: `${origin}/Billing?canceled=true`,
      metadata: {
        tenant_id: profile.tenant_id,
        plan_id,
        billing_cycle: billing_cycle ?? "monthly",
      },
    });
    return json({ url: session.url });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("create-checkout-session error:", error?.message ?? error);
    return json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
}
