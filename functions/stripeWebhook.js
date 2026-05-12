
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // Verify webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Initialize base44 with service role for webhook processing
    const base44 = createClientFromRequest(req);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata.tenant_id;
        const planId = session.metadata.plan_id;
        const billingCycle = session.metadata.billing_cycle;

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        // Create or update subscription record
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({ 
          tenant_id: tenantId 
        });

        if (existingSubs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
            plan_id: planId,
            status: 'active',
            billing_cycle: billingCycle,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_ends_at: null
          });
        } else {
          await base44.asServiceRole.entities.Subscription.create({
            tenant_id: tenantId,
            plan_id: planId,
            status: 'active',
            billing_cycle: billingCycle,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const tenantSubs = await base44.asServiceRole.entities.Subscription.filter({ 
          stripe_subscription_id: subscription.id 
        });

        if (tenantSubs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(tenantSubs[0].id, {
            status: subscription.status === 'active' ? 'active' : subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const tenantSubs = await base44.asServiceRole.entities.Subscription.filter({ 
          stripe_subscription_id: subscription.id 
        });

        if (tenantSubs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(tenantSubs[0].id, {
            status: 'canceled',
            canceled_at: new Date().toISOString()
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const tenantSubs = await base44.asServiceRole.entities.Subscription.filter({ 
          stripe_customer_id: invoice.customer 
        });

        if (tenantSubs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(tenantSubs[0].id, {
            status: 'past_due'
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
