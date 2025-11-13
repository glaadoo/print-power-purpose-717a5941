import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

// Retry utility with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

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
    const apiUrl = Deno.env.get("SINALITE_API_URL") || "https://api.sinaliteuppy.com/v1/products";
    const scope = Deno.env.get("SINALITE_SCOPE") || undefined;

    // Authenticate if credentials are provided
    const needsAuth = clientId && clientSecret;

    if (!needsAuth) {
      console.warn("[SYNC-SINALITE] No credentials configured");
      return new Response(
        JSON.stringify({
          success: false,
          synced: 0,
          total: 0,
          vendor: "sinalite",
          note: "Configure SINALITE_CLIENT_ID and SINALITE_CLIENT_SECRET to enable sync."
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 1: Authenticate with SinaLite
    console.log(`[SYNC-SINALITE] Authenticating with SinaLite at ${authUrl}`);
    console.log(`[SYNC-SINALITE] Using client ID: ${clientId?.substring(0, 8)}...`);

    let accessToken: string | null = null;
    let attemptNotes: string[] = [];

    // Attempt 1: OAuth2 client_credentials with Basic auth and form-encoded body
    try {
      const form = new URLSearchParams({ grant_type: "client_credentials" });
      if (scope) form.append("scope", scope);
      
      const res1 = await withRetry(() => fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: form,
      }));

      const ct1 = res1.headers.get("content-type") || "";
      console.log(`[SYNC-SINALITE] Attempt 1 - Status: ${res1.status}, Content-Type: ${ct1}`);
      
      if (res1.ok && ct1.includes("application/json")) {
        const j1 = await res1.json();
        console.log(`[SYNC-SINALITE] Attempt 1 response body:`, JSON.stringify(j1));
        accessToken = j1.access_token || j1.accessToken || j1.token || null;
        if (accessToken) {
          attemptNotes.push(`attempt1:success:${res1.status}`);
          console.log(`[SYNC-SINALITE] Attempt 1 - Found access token`);
        } else {
          attemptNotes.push(`attempt1:no_token_in_response:${res1.status}`);
          console.error(`[SYNC-SINALITE] Attempt 1 - No token field found in:`, Object.keys(j1));
        }
      } else {
        const t1 = await res1.text();
        console.error(`[SYNC-SINALITE] Attempt 1 failed - ${res1.status}: ${t1.slice(0,200)}`);
        attemptNotes.push(`attempt1:${res1.status}:${t1.slice(0,100)}`);
      }
    } catch (e) {
      attemptNotes.push(`attempt1:error:${(e as Error).message}`);
    }

    // Attempt 2: JSON body without Basic auth (some providers accept this)
    if (!accessToken) {
      try {
        console.log(`[SYNC-SINALITE] Trying attempt 2 - JSON body`);
        const res2 = await withRetry(() => fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "client_credentials",
            ...(scope ? { scope } : {})
          }),
        }));

        const ct2 = res2.headers.get("content-type") || "";
        console.log(`[SYNC-SINALITE] Attempt 2 - Status: ${res2.status}, Content-Type: ${ct2}`);
        
        if (res2.ok && ct2.includes("application/json")) {
          const j2 = await res2.json();
          console.log(`[SYNC-SINALITE] Attempt 2 response body:`, JSON.stringify(j2));
          accessToken = j2.access_token || j2.accessToken || j2.token || null;
          if (accessToken) {
            attemptNotes.push(`attempt2:success:${res2.status}`);
            console.log(`[SYNC-SINALITE] Attempt 2 - Found access token`);
          } else {
            attemptNotes.push(`attempt2:no_token_in_response:${res2.status}`);
            console.error(`[SYNC-SINALITE] Attempt 2 - No token field found in:`, Object.keys(j2));
          }
        } else {
          const t2 = await res2.text();
          console.error(`[SYNC-SINALITE] Attempt 2 failed - ${res2.status}: ${t2.slice(0,200)}`);
          attemptNotes.push(`attempt2:${res2.status}:${t2.slice(0,100)}`);
        }
      } catch (e) {
        attemptNotes.push(`attempt2:error:${(e as Error).message}`);
      }
    }

    if (!accessToken) {
      console.error("[SYNC-SINALITE] No access token in response after attempts", attemptNotes);
      return new Response(
      JSON.stringify({
        success: false,
        synced: 0,
        total: 0,
        vendor: "sinalite",
        note: "Authentication failed to return an access token. Verify client credentials and endpoints.",
        attempts: attemptNotes,
        authUrl,
        apiUrl
      }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 2: Fetch products
    console.log("[SYNC-SINALITE] Fetching products from SinaLite API");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    };

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`SinaLite API error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    let products: any = [];
    if (contentType.includes("application/json")) {
      products = await response.json();
    } else {
      const textBody = await response.text();
      console.warn("[SYNC-SINALITE] Non-JSON response from SinaLite:", textBody.slice(0, 200));
      return new Response(
        JSON.stringify({
          success: false,
          synced: 0,
          total: 0,
          vendor: "sinalite",
          note: "SinaLite endpoint returned non-JSON (e.g., Login Required). Configure API access to enable sync.",
          preview: textBody.slice(0, 200)
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[SYNC-SINALITE] Fetched ${(products?.data?.length ?? products?.length ?? 0)} products`);

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
