import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Token cache to avoid re-authenticating on every request
let cachedToken: { token: string; expiresAt: number } | null = null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, storeCode, productOptions } = await req.json();

    console.log("[SINALITE-PRICE] Request:", { productId, storeCode, productOptions });

    if (!productId || !storeCode || !productOptions || !Array.isArray(productOptions)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: productId, storeCode, productOptions" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get Stripe mode from database to determine Sinalite credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    let sinaliteMode = "test";
    try {
      const modeResponse = await fetch(`${supabaseUrl}/rest/v1/app_settings?key=eq.stripe_mode&select=value`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      });
      const modeData = await modeResponse.json();
      sinaliteMode = modeData[0]?.value || "test";
    } catch (error) {
      console.error('[SINALITE-PRICE] Failed to fetch mode, using test:', error);
    }
    
    const clientId = sinaliteMode === "live" 
      ? Deno.env.get("SINALITE_CLIENT_ID_LIVE")
      : Deno.env.get("SINALITE_CLIENT_ID_TEST");
    const clientSecret = sinaliteMode === "live"
      ? Deno.env.get("SINALITE_CLIENT_SECRET_LIVE")
      : Deno.env.get("SINALITE_CLIENT_SECRET_TEST");
    const authUrl = sinaliteMode === "live"
      ? Deno.env.get("SINALITE_AUTH_URL_LIVE")
      : Deno.env.get("SINALITE_AUTH_URL_TEST");
    const apiUrl = sinaliteMode === "live"
      ? (Deno.env.get("SINALITE_API_URL_LIVE") || "https://api.sinaliteuppy.com")
      : (Deno.env.get("SINALITE_API_URL_TEST") || "https://api.sinaliteuppy.com");
    const audience = sinaliteMode === "live"
      ? Deno.env.get("SINALITE_AUDIENCE_LIVE")
      : Deno.env.get("SINALITE_AUDIENCE_TEST");

    if (!clientId || !clientSecret || !authUrl || !audience) {
      return new Response(
        JSON.stringify({ error: "Missing SinaLite configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check for cached token
    let accessToken = cachedToken?.token;
    const now = Date.now();

    if (!accessToken || !cachedToken || cachedToken.expiresAt <= now) {
      // Authenticate
      console.log("[SINALITE-PRICE] Authenticating...");
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
        console.error("[SINALITE-PRICE] Auth failed:", authResponse.status);
        return new Response(
          JSON.stringify({ error: "Authentication failed" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const authData = await authResponse.json();
      accessToken = authData.access_token;

      if (!accessToken) {
        console.error("[SINALITE-PRICE] No access token received");
        return new Response(
          JSON.stringify({ error: "No access token" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Cache token for 50 minutes (tokens typically last 1 hour)
      cachedToken = {
        token: accessToken,
        expiresAt: now + (50 * 60 * 1000),
      };
      console.log("[SINALITE-PRICE] Token cached");
    } else {
      console.log("[SINALITE-PRICE] Using cached token");
    }

    // Call pricing API - remove /product prefix if present
    const baseUrl = apiUrl.replace(/\/product\/?$/, '');
    const pricingUrl = `${baseUrl}/price/${productId}/${storeCode}`;
    console.log("[SINALITE-PRICE] Calling:", pricingUrl);
    console.log("[SINALITE-PRICE] Options:", productOptions);

    const pricingResponse = await fetch(pricingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ productOptions }),
    });

    if (!pricingResponse.ok) {
      const errorText = await pricingResponse.text();
      console.error("[SINALITE-PRICE] Pricing API error:", pricingResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Pricing API error", details: errorText }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const pricingData = await pricingResponse.json();
    console.log("[SINALITE-PRICE] Response:", pricingData);

    return new Response(
      JSON.stringify(pricingData),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[SINALITE-PRICE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
