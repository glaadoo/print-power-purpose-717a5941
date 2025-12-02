import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: { waitUntil: (promise: Promise<any>) => void } | undefined;

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

// Background task to fetch minimum prices for products
async function fetchMinPricesBackground(
  supabase: any,
  accessToken: string,
  apiBaseUrl: string,
  batchSize = 10
) {
  console.log("[SYNC-SINALITE] Starting background min price fetch...");
  
  try {
    let totalUpdated = 0;
    let iterations = 0;
    const maxIterations = 50; // Process up to 500 products
    
    while (iterations < maxIterations) {
      iterations++;
      
      // Get products that need min_price updated
      const { data: products, error: fetchError } = await supabase
        .from("products")
        .select("id, vendor_product_id, name")
        .eq("vendor", "sinalite")
        .or("min_price_cents.eq.2000,min_price_cents.is.null")
        .limit(batchSize);
      
      if (fetchError) {
        console.error("[SYNC-SINALITE] Error fetching products for min price:", fetchError);
        break;
      }
      
      if (!products || products.length === 0) {
        console.log("[SYNC-SINALITE] All products have min prices updated");
        break;
      }
      
      console.log(`[SYNC-SINALITE] Batch ${iterations}: Processing ${products.length} products`);
      
      for (const product of products) {
        try {
          const productId = product.vendor_product_id;
          const variantsUrl = `${apiBaseUrl}/variants/${productId}/0`;
          
          const variantsRes = await fetch(variantsUrl, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!variantsRes.ok) {
            console.error(`[SYNC-SINALITE] Variants fetch failed for ${productId}: ${variantsRes.status}`);
            continue;
          }
          
          const variants = await variantsRes.json();
          
          // Find minimum price from variants
          let minPrice = Infinity;
          
          if (Array.isArray(variants)) {
            for (const variant of variants) {
              const price = variant.price || variant.unit_price || variant.base_price;
              if (typeof price === 'number' && price > 0 && price < minPrice) {
                minPrice = price;
              }
            }
          } else if (variants && typeof variants === 'object') {
            const variantList = variants.data || variants.variants || Object.values(variants);
            if (Array.isArray(variantList)) {
              for (const variant of variantList) {
                const price = variant.price || variant.unit_price || variant.base_price;
                if (typeof price === 'number' && price > 0 && price < minPrice) {
                  minPrice = price;
                }
              }
            }
          }
          
          if (minPrice !== Infinity && minPrice > 0) {
            const minPriceCents = Math.round(minPrice * 100);
            
            await supabase
              .from("products")
              .update({ 
                min_price_cents: minPriceCents,
                base_cost_cents: minPriceCents 
              })
              .eq("id", product.id);
            
            totalUpdated++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 100));
          
        } catch (err) {
          console.error(`[SYNC-SINALITE] Error processing ${product.name}:`, err);
        }
      }
      
      // Delay between batches
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`[SYNC-SINALITE] Background min price fetch complete. Updated ${totalUpdated} products.`);
    
  } catch (error) {
    console.error("[SYNC-SINALITE] Background min price fetch error:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for store selection
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const storeCode = body.storeCode || 9; // Default to US (9)
    const storeName = storeCode === 6 ? "Canada" : "US";
    const skipMinPrices = body.skipMinPrices || false;
    
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
    const apiBaseUrl = sinaliteMode === "live"
      ? "https://liveapi.sinalite.com"
      : "https://api.sinaliteuppy.com";
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

    // Step 1: Authenticate with SinaLite
    console.log(`[SYNC-SINALITE] Authenticating with SinaLite at ${authUrl}`);

    let accessToken: string | null = null;
    let attemptNotes: string[] = [];

    // Attempt 1: JSON body
    try {
      const res1 = await withRetry(() => fetch(authUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          audience: audience,
          grant_type: "client_credentials",
        }),
      }));
      
      if (res1.ok) {
        const j1 = await res1.json();
        accessToken = j1.access_token || j1.accessToken || j1.token || null;
        if (accessToken) attemptNotes.push(`attempt1:success`);
      }
    } catch (e) {
      attemptNotes.push(`attempt1:error:${(e as Error).message}`);
    }

    // Attempt 2: Form-encoded
    if (!accessToken) {
      try {
        const form2 = new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          audience: audience,
        });
        
        const res2 = await withRetry(() => fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form2,
        }));

        if (res2.ok) {
          const j2 = await res2.json();
          accessToken = j2.access_token || j2.accessToken || j2.token || null;
          if (accessToken) attemptNotes.push(`attempt2:success`);
        }
      } catch (e) {
        attemptNotes.push(`attempt2:error:${(e as Error).message}`);
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          synced: 0,
          vendor: "sinalite",
          note: "Authentication failed. Verify client credentials.",
          attempts: attemptNotes,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 2: Fetch products
    const productUrl = apiUrl || "https://api.sinaliteuppy.com/product";
    console.log(`[SYNC-SINALITE] Fetching products from: ${productUrl}`);
    
    const response = await fetch(productUrl, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`SinaLite API error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    let products: any = [];
    if (contentType.includes("application/json")) {
      products = await response.json();
    } else {
      const textBody = await response.text();
      return new Response(
        JSON.stringify({
          success: false,
          synced: 0,
          vendor: "sinalite",
          note: "SinaLite endpoint returned non-JSON response.",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[SYNC-SINALITE] Fetched ${(products?.data?.length ?? products?.length ?? 0)} products`);

    // Transform products
    const rawProducts = products.data || products || [];
    const enabledProducts = rawProducts.filter((p: any) => p.enabled === 1);
    
    console.log(`[SYNC-SINALITE] Processing ${enabledProducts.length} enabled products`);

    const productsToSync = enabledProducts.map((p: any) => {
      // Default to $20, will be updated by background task
      let baseCostCents = 2000;
      
      if (p.price && typeof p.price === 'number' && p.price > 0) {
        baseCostCents = Math.round(p.price * 100);
      } else if (p.base_price && typeof p.base_price === 'number' && p.base_price > 0) {
        baseCostCents = Math.round(p.base_price * 100);
      }

      let imageUrl = null;
      if (p.image_url) imageUrl = p.image_url;
      else if (p.imageUrl) imageUrl = p.imageUrl;
      else if (p.thumbnail) imageUrl = p.thumbnail;
      else if (p.image) imageUrl = typeof p.image === 'string' ? p.image : p.image?.url;
      else if (p.images && Array.isArray(p.images) && p.images.length > 0) {
        imageUrl = typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url;
      }

      return {
        name: `${p.name || "Unnamed Product"} (${storeName})`,
        description: p.description || p.sku || null,
        base_cost_cents: baseCostCents,
        min_price_cents: baseCostCents,
        category: p.category || "Uncategorized",
        image_url: imageUrl,
        vendor: "sinalite",
        vendor_id: `${p.id}_${storeCode}`,
        vendor_product_id: p.id.toString(),
        pricing_data: p,
      };
    }).filter((p: any) => p.base_cost_cents >= 100 && p.base_cost_cents <= 100000);
    
    console.log(`[SYNC-SINALITE] Prepared ${productsToSync.length} products for sync`);

    // Process products in batches to avoid memory limits
    const BATCH_SIZE = 25;
    let totalSynced = 0;
    let totalImagesPreserved = 0;
    let totalMarkupsPreserved = 0;
    
    for (let i = 0; i < productsToSync.length; i += BATCH_SIZE) {
      const batch = productsToSync.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(productsToSync.length / BATCH_SIZE);
      
      console.log(`[SYNC-SINALITE] Processing batch ${batchNum}/${totalBatches} (${batch.length} products)`);
      
      // Fetch existing products for this batch to preserve custom configurations
      const batchVendorIds = batch.map((p: any) => p.vendor_id);
      const { data: existingProducts, error: fetchError } = await supabase
        .from("products")
        .select("vendor_id, markup_fixed_cents, markup_percent, price_override_cents, image_url, generated_image_url")
        .eq("vendor", "sinalite")
        .in("vendor_id", batchVendorIds);

      if (fetchError) {
        console.error(`[SYNC-SINALITE] Error fetching existing products for batch ${batchNum}:`, fetchError);
      }

      // Create a map of existing product customizations to preserve
      const existingCustomizations = new Map<string, any>();
      if (existingProducts) {
        for (const product of existingProducts) {
          existingCustomizations.set(product.vendor_id, {
            markup_fixed_cents: product.markup_fixed_cents,
            markup_percent: product.markup_percent,
            price_override_cents: product.price_override_cents,
            image_url: product.image_url,
            generated_image_url: product.generated_image_url,
          });
        }
      }

      // Merge new data with existing customizations
      let batchImagesPreserved = 0;
      let batchMarkupsPreserved = 0;
      for (const product of batch) {
        const existing = existingCustomizations.get(product.vendor_id);
        if (existing) {
          // Preserve custom markups if they were set
          if (existing.markup_fixed_cents !== null) {
            product.markup_fixed_cents = existing.markup_fixed_cents;
            batchMarkupsPreserved++;
          }
          if (existing.markup_percent !== null) {
            product.markup_percent = existing.markup_percent;
          }
          if (existing.price_override_cents !== null) {
            product.price_override_cents = existing.price_override_cents;
          }
          // Preserve custom/generated images - only use API image if no custom image exists
          if (existing.image_url && !product.image_url) {
            product.image_url = existing.image_url;
            batchImagesPreserved++;
          } else if (existing.image_url && existing.image_url !== product.image_url) {
            // Keep existing custom image if it differs from API image
            product.image_url = existing.image_url;
            batchImagesPreserved++;
          }
          if (existing.generated_image_url) {
            product.generated_image_url = existing.generated_image_url;
          }
        }
      }
      
      totalImagesPreserved += batchImagesPreserved;
      totalMarkupsPreserved += batchMarkupsPreserved;

      // Upsert this batch
      const { error: upsertError, count } = await supabase
        .from("products")
        .upsert(batch, { onConflict: "vendor,vendor_id", count: "exact" });

      if (upsertError) {
        console.error(`[SYNC-SINALITE] Batch ${batchNum} upsert error:`, upsertError);
        throw upsertError;
      }

      const batchSynced = count || batch.length;
      totalSynced += batchSynced;
      console.log(`[SYNC-SINALITE] Batch ${batchNum}/${totalBatches} complete: ${batchSynced} products synced`);
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < productsToSync.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    console.log(`[SYNC-SINALITE] All batches complete. Total synced: ${totalSynced} products`);
    console.log(`[SYNC-SINALITE] Preserved ${totalImagesPreserved} custom images and ${totalMarkupsPreserved} custom markups`);

    const synced = totalSynced;
    console.log(`[SYNC-SINALITE] Successfully synced ${synced} products`);

    // Start background task to fetch minimum prices
    if (!skipMinPrices && typeof EdgeRuntime !== 'undefined') {
      console.log("[SYNC-SINALITE] Starting background min price fetch...");
      EdgeRuntime.waitUntil(fetchMinPricesBackground(supabase, accessToken, apiBaseUrl, 10));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        total: productsToSync.length,
        vendor: "sinalite",
        store: storeName,
        storeCode,
        imagesPreserved: totalImagesPreserved,
        markupsPreserved: totalMarkupsPreserved,
        minPricesFetching: !skipMinPrices,
        note: !skipMinPrices ? "Min prices are being fetched in the background" : undefined
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
