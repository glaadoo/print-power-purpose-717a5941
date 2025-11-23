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
    // Parse request body for store selection
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const storeCode = body.storeCode || 9; // Default to US (9)
    const storeName = storeCode === 6 ? "Canada" : "US";
    
    console.log(`[SYNC-SINALITE] Starting product sync for ${storeName} store (${storeCode})`);

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
      console.error('[SYNC-SINALITE] Failed to fetch mode, using test:', error);
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
      ? Deno.env.get("SINALITE_API_URL_LIVE")
      : Deno.env.get("SINALITE_API_URL_TEST");
    const audience = sinaliteMode === "live"
      ? Deno.env.get("SINALITE_AUDIENCE_LIVE")
      : Deno.env.get("SINALITE_AUDIENCE_TEST");

    // Validate required configuration
    if (!clientId || !clientSecret || !authUrl || !audience) {
      const missing = [];
      if (!clientId) missing.push("SINALITE_CLIENT_ID");
      if (!clientSecret) missing.push("SINALITE_CLIENT_SECRET");
      if (!authUrl) missing.push("SINALITE_AUTH_URL");
      if (!audience) missing.push("SINALITE_AUDIENCE");
      
      console.error(`[SYNC-SINALITE] Missing required secrets: ${missing.join(", ")}`);
      return new Response(
        JSON.stringify({
          success: false,
          synced: 0,
          total: 0,
          vendor: "sinalite",
          note: `Missing required secrets: ${missing.join(", ")}. Please configure all SinaLite credentials.`
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 1: Authenticate with SinaLite using exact format from user's cURL example
    console.log(`[SYNC-SINALITE] Authenticating with SinaLite at ${authUrl}`);
    console.log(`[SYNC-SINALITE] Using client ID: ${clientId.substring(0, 8)}...`);
    console.log(`[SYNC-SINALITE] Using audience: ${audience}`);

    let accessToken: string | null = null;
    let attemptNotes: string[] = [];

    // Attempt 1: JSON body with all fields (matches user's cURL example exactly)
    try {
      console.log(`[SYNC-SINALITE] Attempt 1 - JSON body (per user's cURL)`);
      const res1 = await withRetry(() => fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          audience: audience,
          grant_type: "client_credentials",
        }),
      }));
      
      const ct1 = res1.headers.get("content-type") || "";
      console.log(`[SYNC-SINALITE] Attempt 1 - Status: ${res1.status}, Content-Type: ${ct1}`);
      
      if (res1.ok && ct1.includes("application/json")) {
        const j1 = await res1.json();
        console.log(`[SYNC-SINALITE] Attempt 1 full response:`, JSON.stringify(j1, null, 2));
        accessToken = j1.access_token || j1.accessToken || j1.token || j1.bearer_token || j1.authToken || null;
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

    // Attempt 2: Form-encoded with all credentials
    if (!accessToken) {
      try {
        console.log(`[SYNC-SINALITE] Attempt 2 - Form-encoded`);
        const form2 = new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          audience: audience,
        });
        
        const res2 = await withRetry(() => fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form2,
        }));

        const ct2 = res2.headers.get("content-type") || "";
        console.log(`[SYNC-SINALITE] Attempt 2 - Status: ${res2.status}, Content-Type: ${ct2}`);
        
        if (res2.ok && ct2.includes("application/json")) {
          const j2 = await res2.json();
          console.log(`[SYNC-SINALITE] Attempt 2 full response:`, JSON.stringify(j2, null, 2));
          accessToken = j2.access_token || j2.accessToken || j2.token || j2.bearer_token || j2.authToken || null;
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
      // Attempt 3: Form-encoded with client_id and client_secret in body (no Basic auth)
      try {
        const form3 = new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          audience: audience,
        });

        const res3 = await withRetry(() => fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
          body: form3,
        }));

        const ct3 = res3.headers.get("content-type") || "";
        console.log(`[SYNC-SINALITE] Attempt 3 - Status: ${res3.status}, Content-Type: ${ct3}`);

        if (res3.ok && ct3.includes("application/json")) {
          const j3 = await res3.json();
          console.log(`[SYNC-SINALITE] Attempt 3 response body:`, JSON.stringify(j3));
          accessToken = j3.access_token || j3.accessToken || j3.token || null;
          if (accessToken) {
            attemptNotes.push(`attempt3:success:${res3.status}`);
            console.log(`[SYNC-SINALITE] Attempt 3 - Found access token`);
          } else {
            attemptNotes.push(`attempt3:no_token_in_response:${res3.status}`);
            console.error(`[SYNC-SINALITE] Attempt 3 - No token field found in:`, Object.keys(j3));
          }
        } else {
          const t3 = await res3.text();
          console.error(`[SYNC-SINALITE] Attempt 3 failed - ${res3.status}: ${t3.slice(0,200)}`);
          attemptNotes.push(`attempt3:${res3.status}:${t3.slice(0,100)}`);
        }
      } catch (e) {
        attemptNotes.push(`attempt3:error:${(e as Error).message}`);
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
    const productUrl = apiUrl || "https://api.sinaliteuppy.com/product";
    console.log(`[SYNC-SINALITE] Fetching products from: ${productUrl}`);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    };

    const response = await fetch(productUrl, { headers });

    if (!response.ok) {
      throw new Error(`SinaLite API error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    let products: any = [];
    if (contentType.includes("application/json")) {
      products = await response.json();
    } else {
      const textBody = await response.text();
      const htmlPreview = textBody.slice(0, 300);
      console.warn("[SYNC-SINALITE] Non-JSON response from SinaLite:", htmlPreview);
      
      // Check if it's an HTML page (likely documentation or login page)
      const isHtml = textBody.trim().toLowerCase().startsWith("<!doctype") || textBody.trim().toLowerCase().startsWith("<html");
      
      return new Response(
        JSON.stringify({
          success: false,
          synced: 0,
          total: 0,
          vendor: "sinalite",
          note: isHtml 
            ? "Configuration Needed: SINALITE_API_URL points to an HTML page (likely documentation). Please update to the actual products API endpoint."
            : "SinaLite endpoint returned non-JSON. Configure API access to enable sync.",
          details: isHtml 
            ? "Update SINALITE_API_URL to point to the products endpoint (e.g., https://api.sinaliteuppy.com/v1/products or https://liveapi.sinalite.com/v1/products)"
            : undefined,
          requestedUrl: productUrl,
          receivedContentType: contentType,
          htmlPreview: isHtml ? htmlPreview : undefined
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[SYNC-SINALITE] Fetched ${(products?.data?.length ?? products?.length ?? 0)} products`);

    // Log first product structure for debugging
    const firstProduct = (products.data || products || [])[0];
    if (firstProduct) {
      console.log(`[SYNC-SINALITE] 🔍 FULL SAMPLE PRODUCT STRUCTURE:`, JSON.stringify(firstProduct, null, 2));
      console.log(`[SYNC-SINALITE] 📋 All available fields:`, Object.keys(firstProduct));
      console.log(`[SYNC-SINALITE] 🖼️  Image-related fields:`, {
        image: firstProduct.image,
        image_url: firstProduct.image_url,
        imageUrl: firstProduct.imageUrl,
        thumbnail: firstProduct.thumbnail,
        images: firstProduct.images,
        productImage: firstProduct.productImage,
        photo: firstProduct.photo,
        picture: firstProduct.picture
      });
    }

    // Transform products - use product data directly without individual pricing calls
    // The pricing will be handled by the global pricing engine based on base costs
    const rawProducts = products.data || products || [];
    const enabledProducts = rawProducts.filter((p: any) => p.enabled === 1);
    
    console.log(`[SYNC-SINALITE] Processing ${enabledProducts.length} enabled products`);
    console.log(`[SYNC-SINALITE] Sample product for ${storeName}:`, JSON.stringify(enabledProducts[0], null, 2).slice(0, 800));
    
    const productsToSync = [];
    for (const p of enabledProducts) {
      let baseCostCents = 2000; // Default $20.00 if no price found
      let minPriceFound = false;
      
      // Strategy 1: Try to get minimum price from /variants endpoint (most accurate)
      try {
        console.log(`[SYNC-SINALITE] Fetching variants/prices for product ${p.id} to find minimum price...`);
        const variantsUrl = `${apiUrl}/${p.id}/variants/0`;
        const variantsResponse = await fetch(variantsUrl, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });
        
        if (variantsResponse.ok) {
          const variants = await variantsResponse.json();
          console.log(`[SYNC-SINALITE] Product ${p.id} variants response:`, { 
            count: variants?.length || 0,
            sample: variants?.[0] 
          });
          
          // Find minimum price from variants
          if (Array.isArray(variants) && variants.length > 0) {
            const prices = variants
              .map((v: any) => parseFloat(v.price || v.unit_price || v.base_price || 0))
              .filter((price: number) => price > 0);
            
            if (prices.length > 0) {
              const minPrice = Math.min(...prices);
              baseCostCents = Math.round(minPrice * 100);
              minPriceFound = true;
              console.log(`[SYNC-SINALITE] ✅ Product ${p.id} minimum price from variants: $${minPrice.toFixed(2)}`);
            }
          }
        }
      } catch (err) {
        console.warn(`[SYNC-SINALITE] Failed to fetch variants for product ${p.id}:`, err);
      }
      
      // Strategy 2: Fallback to product-level price fields
      if (!minPriceFound) {
        if (p.price && typeof p.price === 'number' && p.price > 0) {
          baseCostCents = Math.round(p.price * 100);
          console.log(`[SYNC-SINALITE] Product ${p.id} using product.price: $${p.price.toFixed(2)}`);
        } else if (p.base_price && typeof p.base_price === 'number' && p.base_price > 0) {
          baseCostCents = Math.round(p.base_price * 100);
          console.log(`[SYNC-SINALITE] Product ${p.id} using product.base_price: $${p.base_price.toFixed(2)}`);
        } else if (p.minPrice && typeof p.minPrice === 'number' && p.minPrice > 0) {
          baseCostCents = Math.round(p.minPrice * 100);
          console.log(`[SYNC-SINALITE] Product ${p.id} using product.minPrice: $${p.minPrice.toFixed(2)}`);
        } else if (p.min_price && typeof p.min_price === 'number' && p.min_price > 0) {
          baseCostCents = Math.round(p.min_price * 100);
          console.log(`[SYNC-SINALITE] Product ${p.id} using product.min_price: $${p.min_price.toFixed(2)}`);
        } else {
          console.warn(`[SYNC-SINALITE] Product ${p.id} (${p.name}): No price field found, using default $${baseCostCents / 100}`);
          console.warn(`[SYNC-SINALITE] Available fields:`, Object.keys(p));
        }
      }
      
      // Skip products with unrealistic pricing
      if (baseCostCents < 100 || baseCostCents > 100000) {
        console.log(`[SYNC-SINALITE] Skipping product ${p.id}_${storeCode} (${p.name}) - unrealistic pricing: $${baseCostCents / 100}`);
        continue;
      }

      // Extract image URL from various possible locations
      let imageUrl = null;
      const imageExtractionLog: any = {
        productId: p.id,
        productName: p.name,
        rawImageFields: {}
      };
      
      if (p.image_url) {
        imageUrl = p.image_url;
        imageExtractionLog.source = 'image_url';
        imageExtractionLog.rawImageFields.image_url = p.image_url;
      } else if (p.imageUrl) {
        imageUrl = p.imageUrl;
        imageExtractionLog.source = 'imageUrl';
        imageExtractionLog.rawImageFields.imageUrl = p.imageUrl;
      } else if (p.thumbnail) {
        imageUrl = p.thumbnail;
        imageExtractionLog.source = 'thumbnail';
        imageExtractionLog.rawImageFields.thumbnail = p.thumbnail;
      } else if (p.image) {
        imageUrl = typeof p.image === 'string' ? p.image : p.image?.url || p.image?.src;
        imageExtractionLog.source = 'image';
        imageExtractionLog.rawImageFields.image = p.image;
      } else if (p.images && Array.isArray(p.images) && p.images.length > 0) {
        imageUrl = typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url || p.images[0]?.src;
        imageExtractionLog.source = 'images[0]';
        imageExtractionLog.rawImageFields.images = p.images;
      }
      
      imageExtractionLog.extractedUrl = imageUrl;
      imageExtractionLog.success = !!imageUrl;
      
      // Log EVERY product's image extraction attempt
      console.log(`[SYNC-SINALITE] 🖼️  IMAGE EXTRACTION:`, JSON.stringify(imageExtractionLog, null, 2));
      
      // If no image found, log all available fields to help debug
      if (!imageUrl) {
        console.warn(`[SYNC-SINALITE] ⚠️  NO IMAGE FOUND for product ${p.id} (${p.name})`);
        console.warn(`[SYNC-SINALITE] 📋 All fields in product:`, Object.keys(p));
        console.warn(`[SYNC-SINALITE] 🔍 Full product data:`, JSON.stringify(p, null, 2).slice(0, 1000));
      }

      productsToSync.push({
        name: `${p.name || "Unnamed Product"} (${storeName})`,
        description: p.description || p.sku || null,
        base_cost_cents: baseCostCents,
        category: p.category || "Uncategorized",
        image_url: imageUrl,
        vendor: "sinalite",
        vendor_id: `${p.id}_${storeCode}`, // Unique ID per store
        vendor_product_id: p.id.toString(),
        pricing_data: p, // Store full product data for reference
      });
    }
    
    console.log(`[SYNC-SINALITE] Prepared ${productsToSync.length} products for sync`);

    let synced = 0;
    let imagesFound = 0;
    let imagesMissing = 0;
    let imagesPreserved = 0;
    
    for (const product of productsToSync) {
      if (product.image_url) imagesFound++;
      else imagesMissing++;
      
      // Check if product already exists with an image_url
      const { data: existingProduct } = await supabase
        .from("products")
        .select("image_url")
        .eq("vendor", product.vendor)
        .eq("vendor_id", product.vendor_id)
        .maybeSingle();
      
      // Preserve existing image_url if present, don't overwrite with null/empty
      if (existingProduct?.image_url && !product.image_url) {
        product.image_url = existingProduct.image_url;
        imagesPreserved++;
        console.log(`[SYNC-SINALITE] 🔒 Preserving existing image for:`, product.vendor_id);
      }
      
      console.log(`[SYNC-SINALITE] 💾 Upserting product:`, {
        vendor_id: product.vendor_id,
        name: product.name,
        has_image: !!product.image_url,
        image_url: product.image_url,
        preserved: existingProduct?.image_url && !product.image_url
      });
      
      const { error } = await supabase
        .from("products")
        .upsert(
          product,
          { onConflict: "vendor,vendor_id" }
        );

      if (error) {
        console.error("[SYNC-SINALITE] ❌ Error upserting product:", product.vendor_id, error);
      } else {
        synced++;
      }
    }
    
    console.log(`[SYNC-SINALITE] 📊 IMAGE STATISTICS:`, {
      totalProducts: productsToSync.length,
      imagesPreserved,
      imagesFound,
      imagesMissing,
      percentageWithImages: Math.round((imagesFound / productsToSync.length) * 100) + '%'
    });

    console.log(`[SYNC-SINALITE] Successfully synced ${synced}/${productsToSync.length} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        total: productsToSync.length,
        vendor: "sinalite",
        store: storeName,
        storeCode,
        imagesPreserved
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
