/**
 * Vendor Fulfillment System
 * Handles order fulfillment with support for multiple vendors and fulfillment modes
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { getVendorFulfillmentMode, getVendorConfig } from './vendor-config.ts';
import { sinaliteAdapter } from './vendor-sinalite-adapter.ts';
import { scalablePressAdapter } from './vendor-scalablepress-adapter.ts';
import { psRestfulAdapter } from './vendor-psrestful-adapter.ts';

export interface OrderRecord {
  id: string;
  order_number: string;
  customer_email: string | null;
  customer_name?: string;
  amount_total_cents: number;
  items: any[];
  vendor_key?: string;
  vendor_status?: string;
  vendor_order_id?: string;
  shipping_address?: any;
  billing_address?: any;
  // Tracking fields
  tracking_number?: string | null;
  tracking_url?: string | null;
  tracking_carrier?: string | null;
  shipping_status?: string | null;
  shipped_at?: string | null;
}

export interface TrackingInfo {
  tracking_number?: string;
  tracking_url?: string;
  tracking_carrier?: string;
  shipping_status?: string;
  shipped_at?: string;
  rawResponse?: any;
}

export interface VendorAdapter {
  submitOrder(order: OrderRecord): Promise<{
    vendorOrderId?: string;
    status: string;
    rawResponse?: any;
  }>;
  
  /**
   * Optional: Fetch tracking information from vendor API
   * Implement this method if the vendor provides tracking via API
   * @param vendorOrderId The vendor's order ID
   * @returns Tracking information or null if not available
   */
  getTrackingInfo?(vendorOrderId: string): Promise<TrackingInfo | null>;
}

// Registry of all vendor adapters
const vendorAdapters: Record<string, VendorAdapter> = {
  sinalite: sinaliteAdapter,
  scalablepress: scalablePressAdapter,
  psrestful: psRestfulAdapter,
};

/**
 * Main fulfillment handler - routes to appropriate fulfillment method
 */
export async function handleVendorFulfillment(order: OrderRecord): Promise<void> {
  console.log(`[VENDOR-FULFILLMENT] Processing order ${order.order_number}`);
  
  try {
    const mode = getVendorFulfillmentMode();
    console.log(`[VENDOR-FULFILLMENT] Mode: ${mode}`);

    // Determine vendor key from order
    const vendorKey = determineVendorKey(order);
    console.log(`[VENDOR-FULFILLMENT] Vendor: ${vendorKey}`);

    // Route to appropriate fulfillment method
    switch (mode) {
      case 'AUTO_API':
        await fulfillOrderViaApi(order, vendorKey);
        break;
      case 'EMAIL_VENDOR':
        await fulfillOrderViaEmail(order, vendorKey);
        break;
      case 'MANUAL_EXPORT':
        await queueOrderForManualExport(order, vendorKey);
        break;
      default:
        console.warn(`[VENDOR-FULFILLMENT] Unknown mode: ${mode}, defaulting to AUTO_API`);
        await fulfillOrderViaApi(order, vendorKey);
    }
  } catch (error) {
    console.error('[VENDOR-FULFILLMENT] Error:', error);
    // Update order with error status but don't throw - webhook must return 200
    await updateOrderVendorStatus(order.id, 'error', null, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Determine vendor key from order data
 */
function determineVendorKey(order: OrderRecord): string {
  // Priority 1: Explicit vendor_key on order
  if (order.vendor_key) {
    return order.vendor_key;
  }

  // Priority 2: Vendor from first item if items array exists
  if (order.items && order.items.length > 0) {
    const firstItem = order.items[0];
    if (firstItem.vendor) {
      return firstItem.vendor;
    }
  }

  // Priority 3: Default to sinalite for backwards compatibility
  console.log('[VENDOR-FULFILLMENT] No vendor specified, defaulting to sinalite');
  return 'sinalite';
}

/**
 * OPTION 1: Fulfill order via vendor API
 */
async function fulfillOrderViaApi(order: OrderRecord, vendorKey: string): Promise<void> {
  console.log(`[VENDOR-FULFILLMENT] Fulfilling via API for vendor: ${vendorKey}`);

  const adapter = vendorAdapters[vendorKey];
  if (!adapter) {
    console.error(`[VENDOR-FULFILLMENT] No adapter found for vendor: ${vendorKey}`);
    await updateOrderVendorStatus(
      order.id,
      'error',
      null,
      `No adapter available for vendor: ${vendorKey}`
    );
    return;
  }

  try {
    const result = await adapter.submitOrder(order);
    console.log(`[VENDOR-FULFILLMENT] API result:`, result);

    const config = getVendorConfig(vendorKey);
    await updateOrderVendorStatus(
      order.id,
      result.status || 'submitted',
      result.vendorOrderId,
      null,
      vendorKey,
      config?.name
    );
  } catch (error) {
    console.error(`[VENDOR-FULFILLMENT] API submission failed:`, error);
    await updateOrderVendorStatus(
      order.id,
      'error',
      null,
      error instanceof Error ? error.message : 'API submission failed',
      vendorKey
    );
  }
}

/**
 * OPTION 2: Queue order for manual export
 */
async function queueOrderForManualExport(order: OrderRecord, vendorKey: string): Promise<void> {
  console.log(`[VENDOR-FULFILLMENT] Queueing for manual export: ${vendorKey}`);

  const config = getVendorConfig(vendorKey);
  await updateOrderVendorStatus(
    order.id,
    'pending_manual',
    null,
    null,
    vendorKey,
    config?.name
  );
}

/**
 * OPTION 3: Send order to vendor via email
 */
async function fulfillOrderViaEmail(order: OrderRecord, vendorKey: string): Promise<void> {
  console.log(`[VENDOR-FULFILLMENT] Sending email to vendor: ${vendorKey}`);

  try {
    const config = getVendorConfig(vendorKey);
    const vendorEmail = config?.email;

    if (!vendorEmail) {
      throw new Error(`No email configured for vendor: ${vendorKey}`);
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

    // Build email body
    const emailHtml = buildVendorEmail(order, vendorKey, config?.name || vendorKey);

    await resend.emails.send({
      from: 'Print Power Purpose Orders <orders@printpowerpurpose.com>',
      to: [vendorEmail],
      subject: `New PPP Order #${order.order_number} - ${config?.name || vendorKey}`,
      html: emailHtml,
    });

    console.log(`[VENDOR-FULFILLMENT] Email sent successfully to ${vendorEmail}`);

    await updateOrderVendorStatus(
      order.id,
      'emailed_vendor',
      null,
      null,
      vendorKey,
      config?.name
    );
  } catch (error) {
    console.error('[VENDOR-FULFILLMENT] Email failed:', error);
    await updateOrderVendorStatus(
      order.id,
      'email_error',
      null,
      error instanceof Error ? error.message : 'Email sending failed',
      vendorKey
    );
  }
}

/**
 * Build vendor notification email HTML
 */
function buildVendorEmail(order: OrderRecord, vendorKey: string, vendorName: string): string {
  const items = order.items || [];
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.product_name || 'Unknown Product'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity || 1}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">$${((item.final_price_per_unit || 0) / 100).toFixed(2)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">$${((item.line_subtotal || 0) / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #667eea; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐾 New Order to Fulfill</h1>
            <p>Print Power Purpose Order #${order.order_number}</p>
          </div>
          <div class="content">
            <div class="info-box">
              <h2>Order Details</h2>
              <p><strong>Order Number:</strong> ${order.order_number}</p>
              <p><strong>Vendor:</strong> ${vendorName}</p>
              <p><strong>Customer Email:</strong> ${order.customer_email || 'N/A'}</p>
              <p><strong>Total Amount:</strong> $${((order.amount_total_cents || 0) / 100).toFixed(2)}</p>
            </div>

            ${order.shipping_address ? `
              <div class="info-box">
                <h2>Shipping Address</h2>
                <p>
                  ${order.shipping_address.name || ''}<br>
                  ${order.shipping_address.line1 || ''}<br>
                  ${order.shipping_address.line2 ? order.shipping_address.line2 + '<br>' : ''}
                  ${order.shipping_address.city || ''}, ${order.shipping_address.state || ''} ${order.shipping_address.postal_code || ''}<br>
                  ${order.shipping_address.country || ''}
                </p>
              </div>
            ` : ''}

            <div class="info-box">
              <h2>Line Items</h2>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              This is an automated fulfillment notification from Print Power Purpose.<br>
              Please process this order and update your system accordingly.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Update order vendor status in database
 */
async function updateOrderVendorStatus(
  orderId: string,
  status: string,
  vendorOrderId: string | null = null,
  errorMessage: string | null = null,
  vendorKey: string | null = null,
  vendorName: string | null = null
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const updateData: any = { vendor_status: status };
    
    if (vendorOrderId) updateData.vendor_order_id = vendorOrderId;
    if (errorMessage) updateData.vendor_error_message = errorMessage;
    if (vendorKey) updateData.vendor_key = vendorKey;
    if (vendorName) updateData.vendor_name = vendorName;
    if (status === 'exported_manual' || status === 'emailed_vendor') {
      updateData.vendor_exported_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) {
      console.error('[VENDOR-FULFILLMENT] Error updating order status:', error);
    } else {
      console.log(`[VENDOR-FULFILLMENT] Updated order ${orderId} to status: ${status}`);
    }
  } catch (error) {
    console.error('[VENDOR-FULFILLMENT] Failed to update order status:', error);
  }
}

/**
 * Update tracking information from vendor API
 * Non-blocking - logs errors but doesn't throw
 */
export async function updateTrackingFromVendor(order: OrderRecord): Promise<void> {
  console.log(`[VENDOR-FULFILLMENT] Attempting to fetch tracking for order ${order.order_number}`);
  
  try {
    const vendorKey = order.vendor_key || 'sinalite';
    const adapter = vendorAdapters[vendorKey];
    
    if (!adapter?.getTrackingInfo) {
      console.log(`[VENDOR-FULFILLMENT] No tracking API available for vendor: ${vendorKey}`);
      return;
    }
    
    if (!order.vendor_order_id) {
      console.log(`[VENDOR-FULFILLMENT] No vendor_order_id available for order ${order.order_number}`);
      return;
    }
    
    const trackingInfo = await adapter.getTrackingInfo(order.vendor_order_id);
    
    if (!trackingInfo) {
      console.log(`[VENDOR-FULFILLMENT] No tracking info returned from vendor for ${order.vendor_order_id}`);
      return;
    }
    
    console.log(`[VENDOR-FULFILLMENT] Received tracking info:`, trackingInfo);
    
    // Update order with tracking information
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const updateData: any = {};
    if (trackingInfo.tracking_number) updateData.tracking_number = trackingInfo.tracking_number;
    if (trackingInfo.tracking_url) updateData.tracking_url = trackingInfo.tracking_url;
    if (trackingInfo.tracking_carrier) updateData.tracking_carrier = trackingInfo.tracking_carrier;
    if (trackingInfo.shipping_status) updateData.shipping_status = trackingInfo.shipping_status;
    if (trackingInfo.shipped_at) updateData.shipped_at = trackingInfo.shipped_at;
    
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);
      
      if (error) {
        console.error('[VENDOR-FULFILLMENT] Error updating tracking:', error);
      } else {
        console.log(`[VENDOR-FULFILLMENT] Updated tracking for order ${order.order_number}`);
      }
    }
  } catch (error) {
    console.error('[VENDOR-FULFILLMENT] Error fetching tracking from vendor:', error);
    // Don't throw - this is non-blocking
  }
}