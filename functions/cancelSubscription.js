
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.11.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current subscription
    const subscriptions = await base44.entities.Subscription.filter({ 
      tenant_id: user.tenant_id 
    });
    const subscription = subscriptions[0];

    if (!subscription || !subscription.stripe_subscription_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Cancel in Stripe
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    // Update in database
    await base44.asServiceRole.entities.Subscription.update(subscription.id, {
      status: 'canceled',
      canceled_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Cancel error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
