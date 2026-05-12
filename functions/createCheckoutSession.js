/* global Deno */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.27";
import Stripe from "npm:stripe@14.11.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { plan_id, billing_cycle } = await req.json();
    if (!plan_id) return Response.json({ error: "plan_id required" }, { status: 400 });

    const plans = await base44.asServiceRole.entities.SubscriptionPlan.filter({ id: plan_id });
    const plan = plans?.[0];
    if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });

    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      tenant_id: user.tenant_id,
    });
    let customerId = existingSubs?.[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { tenant_id: user.tenant_id, user_id: user.id },
      });
      customerId = customer.id;
    }

    const priceId = billing_cycle === "yearly" ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;
    if (!priceId) {
      return Response.json({ error: `Plan is missing a stripe_price_id for ${billing_cycle ?? "monthly"}` }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/Billing?success=true`,
      cancel_url: `${req.headers.get("origin")}/Billing?canceled=true`,
      metadata: {
        tenant_id: user.tenant_id,
        plan_id,
        billing_cycle: billing_cycle ?? "monthly",
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error?.message ?? error);
    return Response.json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
