/**
 * SinaLite Vendor Adapter
 * Handles order submission to SinaLite API
 */

import type { VendorAdapter, OrderRecord } from './vendor-fulfillment.ts';

export const sinaliteAdapter: VendorAdapter = {
  async submitOrder(order: OrderRecord) {
    console.log(`[SINALITE-ADAPTER] Submitting order ${order.order_number}`);

    try {
      // Determine environment (test/live) - reuse existing logic
      const sinaliteMode = await getStripeMode();
      
      // Get SinaLite credentials based on mode
      const clientId = sinaliteMode === "live"
        ? Deno.env.get("SINALITE_CLIENT_ID_LIVE")
        : Deno.env.get("SINALITE_CLIENT_ID_TEST");
      const clientSecret = sinaliteMode === "live"
        ? Deno.env.get("SINALITE_CLIENT_SECRET_LIVE")
        : Deno.env.get("SINALITE_CLIENT_SECRET_TEST");
      const authUrl = sinaliteMode === "live"
        ? Deno.env.get("SINALITE_AUTH_URL_LIVE")
        : Deno.env.get("SINALITE_AUTH_URL_TEST");
      const audience = sinaliteMode === "live"
        ? Deno.env.get("SINALITE_AUDIENCE_LIVE")
        : Deno.env.get("SINALITE_AUDIENCE_TEST");

      if (!clientId || !clientSecret || !authUrl || !audience) {
        throw new Error('Missing SinaLite credentials');
      }

      // Authenticate with SinaLite
      console.log('[SINALITE-ADAPTER] Authenticating with SinaLite');
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          audience: audience,
          grant_type: 'client_credentials',
        }),
      });

      if (!authResponse.ok) {
        throw new Error(`SinaLite authentication failed: ${authResponse.status}`);
      }

      const authData = await authResponse.json();
      const accessToken = authData.access_token;

      if (!accessToken) {
        throw new Error('No access token received from SinaLite');
      }

      // Build order payload from our order structure
      const orderPayload = buildSinaliteOrderPayload(order);

      // Determine order endpoint
      const apiUrl = Deno.env.get('SINALITE_API_URL') || 'https://api.sinaliteuppy.com';
      const orderUrl = `${apiUrl}/order/new`;

      console.log(`[SINALITE-ADAPTER] Placing order with ${orderPayload.items.length} items`);

      // Submit order to SinaLite
      const orderResponse = await fetch(orderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`SinaLite order submission failed: ${orderResponse.status} - ${errorText}`);
      }

      const orderData = await orderResponse.json();
      console.log('[SINALITE-ADAPTER] Order submitted successfully:', orderData);

      return {
        vendorOrderId: orderData.orderId || orderData.id,
        status: 'submitted',
        rawResponse: orderData,
      };
    } catch (error) {
      console.error('[SINALITE-ADAPTER] Error:', error);
      throw error;
    }
  }
};

/**
 * Build SinaLite API payload from our order structure
 * TODO: Map your order fields to SinaLite's expected format
 */
function buildSinaliteOrderPayload(order: OrderRecord): any {
  // TODO: This is a placeholder - adjust based on actual SinaLite API requirements
  // See: supabase/functions/place-sinalite-order/index.ts for reference
  
  const items = (order.items || []).map(item => ({
    productId: item.vendor_product_id || item.product_id,
    options: item.configuration || {},
    files: item.artwork_urls ? item.artwork_urls.map((url: string) => ({
      type: 'artwork',
      url: url,
    })) : [],
  }));

  return {
    items,
    shippingInfo: {
      ShipFName: order.shipping_address?.first_name || '',
      ShipLName: order.shipping_address?.last_name || '',
      ShipEmail: order.customer_email || '',
      ShipAddr: order.shipping_address?.line1 || '',
      ShipAddr2: order.shipping_address?.line2 || '',
      ShipCity: order.shipping_address?.city || '',
      ShipState: order.shipping_address?.state || '',
      ShipZip: order.shipping_address?.postal_code || '',
      ShipCountry: order.shipping_address?.country || 'US',
      ShipPhone: order.shipping_address?.phone || '',
      ShipMethod: 'Standard',
    },
    billingInfo: {
      BillFName: order.billing_address?.first_name || order.shipping_address?.first_name || '',
      BillLName: order.billing_address?.last_name || order.shipping_address?.last_name || '',
      BillEmail: order.customer_email || '',
      BillAddr: order.billing_address?.line1 || order.shipping_address?.line1 || '',
      BillAddr2: order.billing_address?.line2 || order.shipping_address?.line2 || '',
      BillCity: order.billing_address?.city || order.shipping_address?.city || '',
      BillState: order.billing_address?.state || order.shipping_address?.state || '',
      BillZip: order.billing_address?.postal_code || order.shipping_address?.postal_code || '',
      BillCountry: order.billing_address?.country || order.shipping_address?.country || 'US',
      BillPhone: order.billing_address?.phone || order.shipping_address?.phone || '',
    },
    notes: `PPP Order #${order.order_number}`,
  };
}

/**
 * Helper to get Stripe mode (copied from webhook logic)
 */
async function getStripeMode(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const response = await fetch(`${supabaseUrl}/rest/v1/app_settings?key=eq.stripe_mode&select=value`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const data = await response.json();
    return data[0]?.value || "test";
  } catch (error) {
    console.error('[SINALITE-ADAPTER] Failed to fetch mode, defaulting to test:', error);
    return "test";
  }
}