/**
 * Send Shipping Notification
 * Sends email to customer when tracking information is added or shipping status changes
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShippingNotificationRequest {
  order: {
    id: string;
    order_number: string;
    customer_email: string;
    customer_name?: string;
    tracking_number?: string;
    tracking_url?: string;
    tracking_carrier?: string;
    shipping_status?: string;
    shipped_at?: string;
    items?: any[];
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SHIPPING-NOTIFICATION] Received request');

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);
    const body: ShippingNotificationRequest = await req.json();
    const { order } = body;

    if (!order?.customer_email) {
      return new Response(
        JSON.stringify({ error: 'Customer email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SHIPPING-NOTIFICATION] Sending notification for order:', order.order_number);

    // Build email content
    const emailHtml = buildShippingEmail(order);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: 'Print Power Purpose <orders@printpowerpurpose.com>',
      to: [order.customer_email],
      subject: order.tracking_number 
        ? `🚚 Your order ${order.order_number} has shipped!`
        : `📦 Shipping update for order ${order.order_number}`,
      html: emailHtml,
    });

    console.log('[SHIPPING-NOTIFICATION] Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[SHIPPING-NOTIFICATION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send notification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Build shipping notification email HTML
 */
function buildShippingEmail(order: any): string {
  const statusMessage = getStatusMessage(order.shipping_status);
  const trackingSection = order.tracking_number ? `
    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h2 style="margin: 0 0 10px 0; color: #0369a1; font-size: 18px;">📦 Tracking Information</h2>
      ${order.tracking_carrier ? `<p style="margin: 5px 0;"><strong>Carrier:</strong> ${order.tracking_carrier}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Tracking Number:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${order.tracking_number}</code></p>
      ${order.tracking_url ? `
        <a href="${order.tracking_url}" 
           style="display: inline-block; margin-top: 15px; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Track Your Package 📍
        </a>
      ` : ''}
    </div>
  ` : '';

  const itemsList = order.items && order.items.length > 0 ? `
    <div style="margin: 20px 0;">
      <h3 style="color: #1e293b; margin-bottom: 10px;">Order Items:</h3>
      ${order.items.map((item: any) => `
        <div style="padding: 10px; background: #f8fafc; margin-bottom: 8px; border-radius: 6px;">
          <strong>${item.product_name || item.name || 'Product'}</strong> × ${item.quantity || 1}
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
              🐾 Print Power Purpose
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
              Shipping Update
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">
              ${statusMessage}
            </h2>
            
            <p style="color: #64748b; line-height: 1.6; margin-bottom: 20px;">
              Order <strong style="color: #0ea5e9;">${order.order_number}</strong>
            </p>

            ${trackingSection}
            ${itemsList}

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                💛 Thank you for supporting our mission to empower communities through print!
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://printpowerpurpose.com/orders" 
                 style="display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Order History
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">
              Questions? Contact us at <a href="mailto:support@printpowerpurpose.com" style="color: #0ea5e9; text-decoration: none;">support@printpowerpurpose.com</a>
            </p>
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} Print Power Purpose. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Get friendly status message
 */
function getStatusMessage(status?: string): string {
  switch (status) {
    case 'shipped':
      return '📦 Your order has shipped!';
    case 'in_transit':
      return '🚚 Your order is on the way!';
    case 'delivered':
      return '✅ Your order has been delivered!';
    case 'pending':
      return '⏳ Your order is being prepared for shipment';
    default:
      return '📬 Shipping update for your order';
  }
}

serve(handler);
