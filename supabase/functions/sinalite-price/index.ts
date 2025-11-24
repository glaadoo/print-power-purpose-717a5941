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
    const { productId, storeCode, productOptions, variantKey, method = 'POST' } = await req.json();

    console.log("[SINALITE-PRICE] Request:", { method, productId, storeCode, productOptions, variantKey });

    // Validate productId and storeCode are valid
    if (!productId || !storeCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: productId, storeCode" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // CRITICAL: Validate productId is not NaN or invalid
    const productIdNum = Number(productId);
    if (isNaN(productIdNum) || productIdNum <= 0) {
      console.error("[SINALITE-PRICE] Invalid productId:", productId);
      return new Response(
        JSON.stringify({ error: "Invalid productId - must be a valid positive number", received: productId }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate storeCode
    const storeCodeNum = Number(storeCode);
    if (isNaN(storeCodeNum) || storeCodeNum <= 0) {
      console.error("[SINALITE-PRICE] Invalid storeCode:", storeCode);
      return new Response(
        JSON.stringify({ error: "Invalid storeCode - must be a valid positive number", received: storeCode }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For pricing calculation, productOptions array is required
    if (method === 'POST' && (!productOptions || !Array.isArray(productOptions))) {
      return new Response(
        JSON.stringify({ error: "productOptions array required for pricing calculation" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For price-by-key lookup, variantKey is required
    if (method === 'PRICEBYKEY' && !variantKey) {
      return new Response(
        JSON.stringify({ error: "variantKey required for PRICEBYKEY method" }),
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
      const authBody = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        audience: audience,
      });
      const authResponse = await fetch(authUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: authBody.toString(),
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error("[SINALITE-PRICE] Auth failed:", {
          status: authResponse.status,
          statusText: authResponse.statusText,
          mode: sinaliteMode,
          authUrl,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasAudience: !!audience,
          errorBody: errorText
        });
        return new Response(
          JSON.stringify({ 
            error: "Authentication failed", 
            details: `Status: ${authResponse.status}, Mode: ${sinaliteMode}`,
            hint: "Check Sinalite API credentials in secrets"
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const authData = await authResponse.json();
      const tokenCandidate = authData?.access_token || authData?.token || authData?.data?.access_token;
      accessToken = tokenCandidate;

      if (!accessToken) {
        const detail = authData && typeof authData === 'object' ? authData : { raw: String(authData) };
        console.error("[SINALITE-PRICE] No access token received", {
          authStatus: authResponse.status,
          authDataKeys: detail ? Object.keys(detail as any) : [],
          authDetail: detail,
        });
        return new Response(
          JSON.stringify({ error: "No access token", authStatus: authResponse.status, authResponse: detail }),
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

    // Call SinaLite API - remove /product prefix if present
    const baseUrl = apiUrl.replace(/\/product\/?$/, '');
    
    let apiResponse;
    
    if (method === 'GET') {
      // GET /product/{id}/{storeCode} - Returns [options[], combinations[], metadata[]]
      const optionsUrl = `${baseUrl}/product/${productId}/${storeCode}`;
      console.log("[SINALITE-PRICE] Calling GET:", optionsUrl);
      
      apiResponse = await fetch(optionsUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
    } else if (method === 'PRICEBYKEY') {
      // GET /pricebykey/{id}/{key} - Returns price for specific variant key (no storeCode)
      const priceByKeyUrl = `${baseUrl}/pricebykey/${productId}/${variantKey}`;
      console.log("[SINALITE-PRICE] Calling PRICEBYKEY:", priceByKeyUrl);
      
      apiResponse = await fetch(priceByKeyUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
    } else {
      // POST /price/{id}/{storeCode} - Returns pricing calculation
      const pricingUrl = `${baseUrl}/price/${productId}/${storeCode}`;
      console.log("[SINALITE-PRICE] Calling POST:", pricingUrl);
      console.log("[SINALITE-PRICE] Option IDs:", productOptions);
      
      apiResponse = await fetch(pricingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productOptions }),
      });
    }

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("[SINALITE-PRICE] API error:", apiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "SinaLite API error", details: errorText, status: apiResponse.status }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const responseData = await apiResponse.json();
    console.log("[SINALITE-PRICE] Response:", responseData);

    return new Response(
      JSON.stringify(responseData),
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
