
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

    // Get subscription
    const subscriptions = await base44.entities.Subscription.filter({ 
      tenant_id: user.tenant_id 
    });
    const subscription = subscriptions[0];

    if (!subscription?.stripe_customer_id) {
      return Response.json({ error: 'No customer found' }, { status: 404 });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/Billing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
