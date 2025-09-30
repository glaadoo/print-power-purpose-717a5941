import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );

    console.log('Webhook event type:', event.type);

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const orderId = session.metadata?.order_id;
      const paymentIntentId = session.payment_intent as string;

      if (orderId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Update order status to paid
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: 'paid',
            stripe_pi_id: paymentIntentId 
          })
          .eq('id', orderId);

        if (error) {
          console.error('Error updating order:', error);
        } else {
          console.log(`Order ${orderId} marked as paid`);
          
          // Optionally: Update cause's raised_cents
          const { data: order } = await supabase
            .from('orders')
            .select('amount_cents, cause_id')
            .eq('id', orderId)
            .single();

          if (order) {
            const { error: causeError } = await supabase.rpc('increment_cause_raised', {
              cause_uuid: order.cause_id,
              amount: order.amount_cents
            });
            
            if (causeError) {
              console.error('Error incrementing cause:', causeError);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
