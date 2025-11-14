import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import jsPDF from 'https://esm.sh/jspdf@2.5.2';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

// Enhanced logging for production debugging
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${logData}`);
};

// Generate PDF receipt
const generateReceiptPDF = (orderData: any, session: any) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(102, 126, 234); // Primary color
  doc.text('Print Power Purpose', 20, 30);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Order Receipt', 20, 40);
  
  // Order details
  doc.setFontSize(10);
  doc.text(`Order #: ${orderData.order_number}`, 20, 55);
  doc.text(`Date: ${new Date(orderData.created_at).toLocaleDateString()}`, 20, 62);
  doc.text(`Email: ${session.customer_details?.email || 'N/A'}`, 20, 69);
  
  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 75, 190, 75);
  
  // Items
  doc.setFontSize(12);
  doc.text('Order Summary', 20, 85);
  doc.setFontSize(10);
  doc.text(`Product: ${orderData.product_name || 'Custom Print Product'}`, 20, 95);
  doc.text(`Quantity: ${orderData.quantity}`, 20, 102);
  doc.text(`Subtotal: $${((session.amount_total || 0) / 100).toFixed(2)}`, 20, 109);
  
  // Donation section
  if (orderData.donation_cents > 0) {
    doc.line(20, 115, 190, 115);
    doc.setFontSize(12);
    doc.setTextColor(76, 175, 80); // Green for donation
    doc.text('Your Impact', 20, 125);
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Donation to ${orderData.cause_name || 'a cause'}: $${(orderData.donation_cents / 100).toFixed(2)}`, 20, 135);
  }
  
  // Total
  doc.line(20, 145, 190, 145);
  doc.setFontSize(14);
  doc.text(`Total: $${((session.amount_total || 0) / 100).toFixed(2)}`, 20, 155);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your order!', 20, 270);
  doc.text('Print Power Purpose - Printing with Purpose', 20, 277);
  
  return doc.output('arraybuffer');
};

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    log('error', 'Missing Stripe signature header');
    return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!webhookSecret) {
    log('error', 'STRIPE_WEBHOOK_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    
    // Verify webhook signature - critical security step
    log('info', 'Verifying webhook signature');
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );

    log('info', 'Webhook verified successfully', { eventType: event.type, eventId: event.id });

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
          }
        }
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
        
        // Log legal acceptance if versions are present in metadata
        if (orderData && session.metadata) {
          const privacyVersion = session.metadata.privacy_version;
          const termsVersion = session.metadata.terms_version;
          const userId = session.metadata.user_id;

          if (privacyVersion && termsVersion) {
            try {
              // Log both policy acceptances
              await supabase.from('legal_logs').insert([
                {
                  user_id: userId || null,
                  order_id: orderData.id,
                  policy_type: 'privacy',
                  version: parseInt(privacyVersion),
                  accepted_at: new Date().toISOString(),
                },
                {
                  user_id: userId || null,
                  order_id: orderData.id,
                  policy_type: 'terms',
                  version: parseInt(termsVersion),
                  accepted_at: new Date().toISOString(),
                }
              ]);
              console.log('Legal acceptance logged successfully');
            } catch (legalLogError) {
              // Don't block payment if logging fails
              console.error('Error logging legal acceptance (non-blocking):', legalLogError);
            }
          }
        }
        
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
        
        // Send auto-receipt email with PDF attachment
        if (session.customer_details?.email && orderData) {
          try {
            // Generate PDF receipt
            const pdfBuffer = generateReceiptPDF(orderData, session);
            const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
            
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
                      <p><strong>A detailed PDF receipt is attached to this email.</strong></p>
                      
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
              attachments: [
                {
                  filename: `receipt-${orderNumber}.pdf`,
                  content: pdfBase64,
                },
              ],
            });
            
            if (emailError) {
              console.error('Error sending receipt email:', emailError);
            } else {
              console.log(`Receipt email with PDF sent successfully`);
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
    // Log detailed error server-side only
    console.error('Webhook processing failed:', {
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      type: err?.constructor?.name
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        code: 'WEBHOOK_ERROR'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
