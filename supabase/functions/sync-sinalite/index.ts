import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SYNC-SINALITE] Starting product sync");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const clientId = Deno.env.get("SINALITE_CLIENT_ID");
    const clientSecret = Deno.env.get("SINALITE_CLIENT_SECRET");
    const authUrl = Deno.env.get("SINALITE_AUTH_URL") || "https://api.sinaliteuppy.com/auth/token";
    const apiUrl = Deno.env.get("SINALITE_API_URL") || "https://apifrontend_stage.sinaliteuppy.com/demo/demo.php";

    if (!clientId || !clientSecret) {
      console.error("[SYNC-SINALITE] Missing SINALITE_CLIENT_ID or SINALITE_CLIENT_SECRET");
      return new Response(
        JSON.stringify({ error: "SinaLite API credentials not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 1: Authenticate to get access token
    console.log("[SYNC-SINALITE] Authenticating with SinaLite");
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`SinaLite Auth error: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    if (!accessToken) {
      throw new Error("No access token received from SinaLite");
    }

    // Step 2: Fetch products using access token
    console.log("[SYNC-SINALITE] Fetching products from SinaLite API");
    const response = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`SinaLite API error: ${response.status}`);
    }

    const products = await response.json();
    console.log(`[SYNC-SINALITE] Fetched ${products.length || 0} products`);

    // Transform and upsert products
    const productsToSync = (products.data || products || []).map((p: any) => ({
      name: p.name || p.title || p.product_name || "Unnamed Product",
      description: p.description || p.details || p.product_description || null,
      base_cost_cents: Math.round((p.price || p.cost || p.base_price || 0) * 100),
      category: p.category || p.product_category || "print",
      image_url: p.image || p.thumbnail || p.image_url || p.product_image || null,
      vendor: "sinalite",
      vendor_id: String(p.id || p.sku || p.product_id || p.product_sku),
    }));

    let synced = 0;
    for (const product of productsToSync) {
      const { error } = await supabase
        .from("products")
        .upsert(
          product,
          { onConflict: "vendor,vendor_id" }
        );

      if (error) {
        console.error("[SYNC-SINALITE] Error upserting product:", product.vendor_id, error);
      } else {
        synced++;
      }
    }

    console.log(`[SYNC-SINALITE] Successfully synced ${synced}/${productsToSync.length} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        total: productsToSync.length,
        vendor: "sinalite"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[SYNC-SINALITE] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
