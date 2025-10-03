import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const priceFromBase = (base: number) => Math.max(100, Math.round(base * 1.6));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, qty, causeId, donationCents = 0 } = await req.json();

    // Validate inputs
    if (!productId || !qty || !causeId || qty < 1 || qty > 100 || donationCents < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify cause exists
    const { data: cause, error: causeError } = await supabase
      .from('causes')
      .select('id, name')
      .eq('id', causeId)
      .single();

    if (causeError || !cause) {
      return new Response(
        JSON.stringify({ error: 'Cause not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate price server-side
    const unitPrice = priceFromBase(product.base_cost_cents);
    const totalAmount = (unitPrice * qty) + donationCents;

    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        product_id: productId,
        cause_id: causeId,
        qty,
        amount_cents: totalAmount,
        status: 'created'
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe Checkout Session
    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:8080';
    
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: `Supporting: ${cause.name}`,
          },
          unit_amount: unitPrice,
        },
        quantity: qty,
      },
    ];

    // Add donation as a separate line item if present
    if (donationCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Additional Donation',
            description: `Extra support for ${cause.name}`,
          },
          unit_amount: donationCents,
        },
        quantity: 1,
      });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?payment=cancelled`,
      metadata: {
        order_id: order.id,
        cause_id: causeId,
      },
    });

    // Update order with Stripe session ID
    await supabase
      .from('orders')
      .update({ stripe_cs_id: session.id })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
