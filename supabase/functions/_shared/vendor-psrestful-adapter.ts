/**
 * PSRestful Vendor Adapter
 * Handles order submission to PSRestful API
 */

import type { VendorAdapter, OrderRecord } from './vendor-fulfillment.ts';
import { getPSRestfulTracking } from './vendor-psrestful-adapter-tracking.ts';

export const psRestfulAdapter: VendorAdapter = {
  async submitOrder(order: OrderRecord) {
    console.log(`[PSRESTFUL-ADAPTER] Submitting order ${order.order_number}`);

    try {
      const apiKey = Deno.env.get('PSRESTFUL_API_KEY');
      const apiBaseUrl = Deno.env.get('PSRESTFUL_API_BASE_URL');

      if (!apiKey || !apiBaseUrl) {
        throw new Error('PSRestful API credentials not configured');
      }

      // Build order payload
      const orderPayload = buildPSRestfulOrderPayload(order);

      // TODO: Determine exact PSRestful order submission endpoint
      // This is a placeholder - update with actual endpoint
      const orderUrl = `${apiBaseUrl}/orders`;

      console.log('[PSRESTFUL-ADAPTER] Submitting to PSRestful');

      const orderResponse = await fetch(orderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`PSRestful order failed: ${orderResponse.status} - ${errorText}`);
      }

      const orderData = await orderResponse.json();
      console.log('[PSRESTFUL-ADAPTER] Order submitted successfully:', orderData);

      return {
        vendorOrderId: orderData.orderId || orderData.order_id,
        status: 'submitted',
        rawResponse: orderData,
      };
    } catch (error) {
      console.error('[PSRESTFUL-ADAPTER] Error:', error);
      throw error;
    }
  },

  // Tracking API integration
  async getTrackingInfo(vendorOrderId: string) {
    return await getPSRestfulTracking(vendorOrderId);
  }
};

/**
 * Build PSRestful API payload from our order structure
 * TODO: Map to actual PSRestful API format
 */
function buildPSRestfulOrderPayload(order: OrderRecord): any {
  // TODO: This is a placeholder structure
  // Update based on PSRestful API documentation
  
  const items = (order.items || []).map(item => ({
    productId: item.vendor_product_id || item.product_id,
    sku: item.sku,
    quantity: item.quantity || 1,
    configuration: item.configuration || {},
    artwork: item.artwork_urls || [],
  }));

  return {
    orderNumber: order.order_number,
    customerEmail: order.customer_email,
    items,
    shipping: {
      firstName: order.shipping_address?.first_name || '',
      lastName: order.shipping_address?.last_name || '',
      address1: order.shipping_address?.line1 || '',
      address2: order.shipping_address?.line2 || '',
      city: order.shipping_address?.city || '',
      state: order.shipping_address?.state || '',
      postalCode: order.shipping_address?.postal_code || '',
      country: order.shipping_address?.country || 'US',
      phone: order.shipping_address?.phone || '',
    },
    // Add other required fields based on PSRestful documentation
  };
}