import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const clientId = Deno.env.get("SINALITE_CLIENT_ID");
    const clientSecret = Deno.env.get("SINALITE_CLIENT_SECRET");
    const authUrl = Deno.env.get("SINALITE_AUTH_URL");
    const apiUrl = Deno.env.get("SINALITE_API_URL") || "https://api.sinaliteuppy.com";
    const audience = Deno.env.get("SINALITE_AUDIENCE");

    if (!clientId || !clientSecret || !authUrl || !audience) {
      return new Response(
        JSON.stringify({ error: "Missing SinaLite configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
    const accessToken = authData.access_token;

    if (!accessToken) {
      console.error("[SINALITE-PRICE] No access token received");
      return new Response(
        JSON.stringify({ error: "No access token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
