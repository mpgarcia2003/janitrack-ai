import Stripe from "stripe";
import { supabaseAdmin } from "./_supabase.js";

// Stripe needs the raw body for signature verification, which means Node runtime
// + bodyParser disabled. Vercel passes the request as a Web `Request` so we just
// call `req.text()` to get the raw payload.
export const config = { runtime: "nodejs" };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

const readPeriod = (subscription) => {
  const fromItem = subscription?.items?.data?.[0];
  const start = subscription?.current_period_start ?? fromItem?.current_period_start;
  const end = subscription?.current_period_end ?? fromItem?.current_period_end;
  return {
    start: start ? new Date(start * 1000).toISOString() : null,
    end: end ? new Date(end * 1000).toISOString() : null,
  };
};

async function isAlreadyProcessed(eventId) {
  const { data } = await supabaseAdmin
    .from("processed_stripe_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();
  return !!data;
}

async function markProcessed(eventId, type) {
  await supabaseAdmin
    .from("processed_stripe_events")
    .insert({ stripe_event_id: eventId, event_type: type, processed_at: new Date().toISOString() })
    .select()
    .maybeSingle();
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Stripe webhook signature verification failed:", err?.message ?? err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  try {
    if (await isAlreadyProcessed(event.id)) {
      return new Response(JSON.stringify({ received: true, deduped: true }), { status: 200 });
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

        const { data: existing } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        const payload = {
          plan_id: planId,
          status: "active",
          billing_cycle: billingCycle,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscription.id,
          current_period_start: start,
          current_period_end: end,
          trial_ends_at: null,
        };
        if (existing) {
          await supabaseAdmin.from("subscriptions").update(payload).eq("id", existing.id);
        } else {
          await supabaseAdmin.from("subscriptions").insert({ tenant_id: tenantId, ...payload });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const { start, end } = readPeriod(subscription);
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: start,
            current_period_end: end,
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", invoice.customer);
        break;
      }
      default:
        break;
    }

    await markProcessed(event.id, event.type);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("stripe-webhook error:", error?.message ?? error);
    return new Response(JSON.stringify({ error: error?.message ?? "Internal error" }), { status: 500 });
  }
}
