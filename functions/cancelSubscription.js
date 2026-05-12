/* global Deno */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.27";
import Stripe from "npm:stripe@14.11.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const subs = await base44.asServiceRole.entities.Subscription.filter({
      tenant_id: user.tenant_id,
    });
    const subscription = subs?.[0];
    if (!subscription?.stripe_subscription_id) {
      return Response.json({ error: "No active subscription found" }, { status: 404 });
    }

    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    await base44.asServiceRole.entities.Subscription.update(subscription.id, {
      status: "canceled",
      canceled_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Cancel error:", error?.message ?? error);
    return Response.json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
