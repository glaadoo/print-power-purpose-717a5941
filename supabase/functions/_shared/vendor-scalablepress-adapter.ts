/**
 * Scalable Press Vendor Adapter
 * Handles order submission to Scalable Press API
 */

import type { VendorAdapter, OrderRecord } from './vendor-fulfillment.ts';
import { getScalablePressTracking } from './vendor-scalablepress-adapter-tracking.ts';

export const scalablePressAdapter: VendorAdapter = {
  async submitOrder(order: OrderRecord) {
    console.log(`[SCALABLEPRESS-ADAPTER] Submitting order ${order.order_number}`);

    try {
      const apiKey = Deno.env.get('SCALABLEPRESS_API_KEY');
      const apiBaseUrl = Deno.env.get('SCALABLEPRESS_API_BASE_URL') || 'https://api.scalablepress.com/v2';

      if (!apiKey) {
        throw new Error('SCALABLEPRESS_API_KEY not configured');
      }

      // Build order payload
      const orderPayload = buildScalablePressOrderPayload(order);

      // TODO: Determine exact Scalable Press order submission endpoint
      // This is a placeholder - update with actual endpoint
      const orderUrl = `${apiBaseUrl}/orders`;

      console.log('[SCALABLEPRESS-ADAPTER] Submitting to Scalable Press');

      const orderResponse = await fetch(orderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(apiKey + ':')}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`Scalable Press order failed: ${orderResponse.status} - ${errorText}`);
      }

      const orderData = await orderResponse.json();
      console.log('[SCALABLEPRESS-ADAPTER] Order submitted successfully:', orderData);

      return {
        vendorOrderId: orderData.orderId || orderData.orderToken,
        status: 'submitted',
        rawResponse: orderData,
      };
    } catch (error) {
      console.error('[SCALABLEPRESS-ADAPTER] Error:', error);
      throw error;
    }
  },

  // Tracking API integration
  async getTrackingInfo(vendorOrderId: string) {
    return await getScalablePressTracking(vendorOrderId);
  }
};

/**
 * Build Scalable Press API payload from our order structure
 * TODO: Map to actual Scalable Press API format
 * Reference: https://scalablepress.com/docs/#create-order
 */
function buildScalablePressOrderPayload(order: OrderRecord): any {
  // TODO: This is a placeholder structure
  // Update based on Scalable Press API documentation
  
  const products = (order.items || []).map(item => ({
    type: item.vendor_product_id || item.product_id,
    quantity: item.quantity || 1,
    color: item.configuration?.color,
    size: item.configuration?.size,
    design: {
      type: 'url',
      url: item.artwork_urls?.[0] || '',
    },
  }));

  return {
    orderToken: order.order_number,
    products,
    address: {
      name: `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`,
      address1: order.shipping_address?.line1 || '',
      address2: order.shipping_address?.line2 || '',
      city: order.shipping_address?.city || '',
      state: order.shipping_address?.state || '',
      zip: order.shipping_address?.postal_code || '',
      country: order.shipping_address?.country || 'US',
      email: order.customer_email || '',
      phone: order.shipping_address?.phone || '',
    },
    // Add other required fields based on Scalable Press documentation
  };
}