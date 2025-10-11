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
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Extract order data from session metadata and session object
      const orderNumber = session.metadata?.order_number || `ORD-${Date.now()}`;
      const causeName = session.metadata?.cause_name || null;
      const causeId = session.metadata?.cause_id || null;
      const productName = session.metadata?.product_name || null;
      const donationCents = parseInt(session.metadata?.donation_cents || '0');
      const quantity = parseInt(session.metadata?.quantity || '1');

      // Create order record
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          session_id: session.id,
          status: 'completed',
          customer_email: session.customer_details?.email || null,
          currency: session.currency || 'usd',
          amount_total_cents: session.amount_total || 0,
          donation_cents: donationCents,
          quantity: quantity,
          product_name: productName,
          cause_id: causeId,
          cause_name: causeName,
          receipt_url: (session as any).receipt_url || null,
        });

      if (orderError) {
        console.error('Error creating order:', orderError);
      } else {
        console.log(`Order ${orderNumber} created successfully`);
        
        // Update cause's raised_cents if cause_id exists
        if (causeId && donationCents > 0) {
          const { error: causeError } = await supabase.rpc('increment_cause_raised', {
            cause_uuid: causeId,
            amount: donationCents
          });
          
          if (causeError) {
            console.error('Error incrementing cause:', causeError);
          } else {
            console.log(`Incremented cause ${causeId} by ${donationCents} cents`);
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
