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
    if (!subscription?.stripe_customer_id) {
      return Response.json({ error: "No customer found" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${req.headers.get("origin")}/Billing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error?.message ?? error);
    return Response.json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
