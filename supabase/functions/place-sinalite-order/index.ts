import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  productId: number;
  options: Record<string, string>;
  files: Array<{ type: string; url: string }>;
}

interface ShippingInfo {
  ShipFName: string;
  ShipLName: string;
  ShipEmail: string;
  ShipAddr: string;
  ShipAddr2?: string;
  ShipCity: string;
  ShipState: string;
  ShipZip: string;
  ShipCountry: string;
  ShipPhone: string;
  ShipMethod: string;
}

interface BillingInfo {
  BillFName: string;
  BillLName: string;
  BillEmail: string;
  BillAddr: string;
  BillAddr2?: string;
  BillCity: string;
  BillState: string;
  BillZip: string;
  BillCountry: string;
  BillPhone: string;
}

interface OrderRequest {
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  billingInfo: BillingInfo;
  notes?: string;
  storeCode?: number; // 6 for Canada, 9 for US
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[PLACE-SINALITE-ORDER] Starting order placement");

    const orderRequest: OrderRequest = await req.json();
    const { items, shippingInfo, billingInfo, notes, storeCode = 9 } = orderRequest;

    // Validate required fields
    if (!items || items.length === 0) {
      throw new Error("Order must contain at least one item");
    }
    if (!shippingInfo) {
      throw new Error("Shipping information is required");
    }
    if (!billingInfo) {
      throw new Error("Billing information is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get Stripe mode from database to determine Sinalite credentials
    let sinaliteMode = "test";
    try {
      const { data: settingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'stripe_mode')
        .single();
      sinaliteMode = settingData?.value || "test";
    } catch (error) {
      console.error('[PLACE-SINALITE-ORDER] Failed to fetch mode, using test:', error);
    }

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
      throw new Error("Missing SinaLite credentials");
    }

    // Authenticate with SinaLite
    console.log("[PLACE-SINALITE-ORDER] Authenticating with SinaLite");
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: audience,
        grant_type: "client_credentials",
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`SinaLite authentication failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    if (!accessToken) {
      throw new Error("No access token received from SinaLite");
    }

    // Determine order endpoint based on environment
    const apiUrl = Deno.env.get("SINALITE_API_URL") || "https://api.sinaliteuppy.com";
    const orderUrl = `${apiUrl}/order/new`;

    console.log(`[PLACE-SINALITE-ORDER] Placing order with ${items.length} items`);

    // Place order with SinaLite
    const orderResponse = await fetch(orderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items,
        shippingInfo,
        billingInfo,
        notes,
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("[PLACE-SINALITE-ORDER] Order failed:", errorText);
      throw new Error(`SinaLite order failed: ${orderResponse.status} - ${errorText}`);
    }

    const orderData = await orderResponse.json();
    console.log("[PLACE-SINALITE-ORDER] Order placed successfully:", orderData);

    // Log order to system_logs
    await supabase.from("system_logs").insert({
      level: "info",
      category: "sinalite_order",
      message: `SinaLite order placed successfully`,
      metadata: {
        sinaliteOrderId: orderData.orderId || orderData.id,
        itemCount: items.length,
        storeCode,
        shippingEmail: shippingInfo.ShipEmail,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: orderData,
        message: "Order placed successfully with SinaLite",
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[PLACE-SINALITE-ORDER] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
