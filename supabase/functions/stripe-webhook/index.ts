import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

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
      const existingOrderId = session.metadata?.order_id || null;
      const orderNumber = session.metadata?.order_number || `ORD-${Date.now()}`;
      const causeName = session.metadata?.cause_name || null;
      const causeId = session.metadata?.cause_id || null;
      const productName = session.metadata?.product_name || null;
      const donationCents = parseInt(session.metadata?.donation_cents || '0');
      const quantity = parseInt(session.metadata?.quantity || '1');

      let orderData;
      let orderError;

      // If order_id exists in metadata, update existing order (JotForm flow)
      if (existingOrderId) {
        console.log(`Updating existing order: ${existingOrderId}`);
        const updateResult = await supabase
          .from('orders')
          .update({
            status: 'completed',
            customer_email: session.customer_details?.email || null,
            amount_total_cents: session.amount_total || 0,
            receipt_url: (session as any).receipt_url || null,
          })
          .eq('id', existingOrderId)
          .select()
          .single();
        
        orderData = updateResult.data;
        orderError = updateResult.error;
      } else {
        // Create new order record (direct Stripe flow)
        console.log(`Creating new order`);
        const insertResult = await supabase
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
          })
          .select()
          .single();
        
        orderData = insertResult.data;
        orderError = insertResult.error;
      }

      if (orderError) {
        console.error('Error creating order:', orderError);
      } else {
        console.log(`Order created successfully`);
        
        // Create donation record if donation amount > 0
        if (causeId && donationCents > 0 && orderData) {
          const { error: donationError } = await supabase
            .from('donations')
            .insert({
              order_id: orderData.id,
              cause_id: causeId,
              amount_cents: donationCents,
              customer_email: session.customer_details?.email || null,
            });
          
          if (donationError) {
            console.error('Error creating donation record:', donationError);
          } else {
            console.log(`Donation record created successfully`);
          }
        }
        
        // Update cause's raised_cents if cause_id exists
        if (causeId && donationCents > 0) {
          const { error: causeError } = await supabase.rpc('increment_cause_raised', {
            cause_uuid: causeId,
            amount: donationCents
          });
          
          if (causeError) {
            console.error('Error incrementing cause:', causeError);
          } else {
            console.log(`Cause donation total updated successfully`);
          }
        }
        
        // Send auto-receipt email
        if (session.customer_details?.email) {
          try {
            const receiptHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .total { font-size: 24px; font-weight: bold; color: #667eea; margin: 20px 0; }
                    .donation-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🐾 Thank You for Your Order!</h1>
                      <p>Order #${orderNumber}</p>
                    </div>
                    <div class="content">
                      <p>Hi there,</p>
                      <p>Thank you for your purchase! Your order has been confirmed and is being processed.</p>
                      
                      <div class="order-details">
                        <h2>Order Summary</h2>
                        <p><strong>Product:</strong> ${productName || 'Custom Print Product'}</p>
                        <p><strong>Quantity:</strong> ${quantity}</p>
                        <p><strong>Total:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
                      </div>
                      
                      ${donationCents > 0 ? `
                        <div class="donation-box">
                          <h3>💚 Your Impact</h3>
                          <p>You donated <strong>$${(donationCents / 100).toFixed(2)}</strong> to ${causeName || 'a cause'}!</p>
                          <p>Thank you for making a difference in your community.</p>
                        </div>
                      ` : ''}
                      
                      <p>We'll send you another email when your order ships.</p>
                      
                      <div class="footer">
                        <p>Print Power Purpose - Printing with Purpose</p>
                        <p>Questions? Reply to this email and we'll be happy to help!</p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `;
            
            const { error: emailError } = await resend.emails.send({
              from: 'Print Power Purpose <onboarding@resend.dev>',
              to: [session.customer_details.email],
              subject: `Order Confirmation #${orderNumber}`,
              html: receiptHtml,
            });
            
            if (emailError) {
              console.error('Error sending receipt email:', emailError);
            } else {
              console.log(`Receipt email sent successfully`);
            }
          } catch (emailErr) {
            console.error('Failed to send receipt email:', emailErr);
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
