
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

    const { plan_id, billing_cycle } = await req.json();

    // Get the plan
    const plans = await base44.entities.SubscriptionPlan.filter({ id: plan_id });
    const plan = plans[0];
    
    if (!plan) {
      return Response.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    const subscriptions = await base44.entities.Subscription.filter({ tenant_id: user.tenant_id });
    let customerId = subscriptions[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          tenant_id: user.tenant_id,
          user_id: user.id
        }
      });
      customerId = customer.id;
    }

    // Determine price ID based on billing cycle
    const priceId = billing_cycle === 'yearly' 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/Billing?success=true`,
      cancel_url: `${req.headers.get('origin')}/Billing?canceled=true`,
      metadata: {
        tenant_id: user.tenant_id,
        plan_id: plan_id,
        billing_cycle: billing_cycle
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
