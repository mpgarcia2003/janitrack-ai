/* global Deno */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.27";
import Stripe from "npm:stripe@14.11.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

/**
 * Read `current_period_start` / `current_period_end` from a Stripe subscription
 * regardless of API version. Newer API versions move the dates onto the
 * subscription item (`items.data[0]`); older versions kept them on the root.
 */
function readPeriod(subscription) {
  const fromItem = subscription?.items?.data?.[0];
  const start = subscription?.current_period_start ?? fromItem?.current_period_start;
  const end = subscription?.current_period_end ?? fromItem?.current_period_end;
  return {
    start: start ? new Date(start * 1000).toISOString() : null,
    end: end ? new Date(end * 1000).toISOString() : null,
  };
}

/**
 * Best-effort idempotency check: if we've already recorded this Stripe event id,
 * skip processing. Relies on a `ProcessedStripeEvent` entity having a unique
 * `stripe_event_id` field. If the entity doesn't exist (older deployments),
 * we fail open and just process the event — Stripe retries are still rare enough
 * that double-processing is mostly harmless once create-vs-update logic exists.
 */
async function isAlreadyProcessed(base44, eventId) {
  try {
    const existing = await base44.asServiceRole.entities.ProcessedStripeEvent?.filter?.({
      stripe_event_id: eventId,
    });
    return Array.isArray(existing) && existing.length > 0;
  } catch {
    return false;
  }
}

async function markProcessed(base44, eventId, type) {
  try {
    await base44.asServiceRole.entities.ProcessedStripeEvent?.create?.({
      stripe_event_id: eventId,
      event_type: type,
      processed_at: new Date().toISOString(),
    });
  } catch {
    // ignore — best-effort
  }
}

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err?.message ?? err);
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    if (await isAlreadyProcessed(base44, event.id)) {
      return Response.json({ received: true, deduped: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id;
        const planId = session.metadata?.plan_id;
        const billingCycle = session.metadata?.billing_cycle ?? "monthly";

        if (!tenantId || !planId) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const { start, end } = readPeriod(subscription);

        const existing = await base44.asServiceRole.entities.Subscription.filter({
          tenant_id: tenantId,
        });

        if (existing?.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            plan_id: planId,
            status: "active",
            billing_cycle: billingCycle,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscription.id,
            current_period_start: start,
            current_period_end: end,
            trial_ends_at: null,
          });
        } else {
          await base44.asServiceRole.entities.Subscription.create({
            tenant_id: tenantId,
            plan_id: planId,
            status: "active",
            billing_cycle: billingCycle,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscription.id,
            current_period_start: start,
            current_period_end: end,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const { start, end } = readPeriod(subscription);

        const existing = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id,
        });
        if (existing?.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            status: subscription.status,
            current_period_start: start,
            current_period_end: end,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const existing = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscription.id,
        });
        if (existing?.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            status: "canceled",
            canceled_at: new Date().toISOString(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const existing = await base44.asServiceRole.entities.Subscription.filter({
          stripe_customer_id: invoice.customer,
        });
        if (existing?.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            status: "past_due",
          });
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }

    await markProcessed(base44, event.id, event.type);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error?.message ?? error);
    return Response.json({ error: error?.message ?? "Internal error" }, { status: 500 });
  }
});
