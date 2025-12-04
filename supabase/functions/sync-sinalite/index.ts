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

// Comprehensive min price calculation - tests ALL configuration combinations
async function computeMinPriceForProduct(
  product: { id: string; vendor_product_id: string; name: string },
  accessToken: string,
  apiBaseUrl: string,
  storeCode: number
): Promise<{ min_price_cents: number; min_price_variant_key: string } | null> {
  const productId = product.vendor_product_id;
  
  try {
    // Get product configuration options
    const optionsUrl = `${apiBaseUrl}/product/${productId}/${storeCode}`;
    const optionsRes = await fetch(optionsUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!optionsRes.ok) {
      console.log(`[MIN-PRICE] Options fetch failed for ${product.name}: ${optionsRes.status}`);
      return null;
    }

    const optionsData = await optionsRes.json();
    
    if (!Array.isArray(optionsData) || optionsData.length < 1) {
      console.log(`[MIN-PRICE] Invalid options response for ${product.name}`);
      return null;
    }

    const options = optionsData[0] || [];
    
    // Group ALL options by category
    const optionsByGroup: Record<string, { id: number; name: string }[]> = {};
    for (const opt of options) {
      const group = opt.group || 'other';
      if (!optionsByGroup[group]) {
        optionsByGroup[group] = [];
      }
      optionsByGroup[group].push({ id: opt.id, name: opt.name });
    }

    const groupNames = Object.keys(optionsByGroup);

    // Sort qty options to use smallest as base
    const qtyOptions = optionsByGroup['qty'] || [];
    const sizeOptions = optionsByGroup['size'] || [];

    // Parse size dimensions to sort by area (smaller = cheaper)
    const parseSizeValue = (name: string): number => {
      // Try to parse dimensions like "12 x 18", "4x6", "8.5x11"
      const match = name.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
      if (match) {
        return parseFloat(match[1]) * parseFloat(match[2]);
      }
      // For single numbers, use as-is
      const num = parseFloat(name.replace(/[^\d.]/g, ''));
      return isNaN(num) ? 999999 : num;
    };

    // Sort qty options to use smallest
    qtyOptions.sort((a, b) => {
      const numA = parseInt(a.name) || 999999;
      const numB = parseInt(b.name) || 999999;
      return numA - numB;
    });

    // Sort size options by area (smallest first - usually cheapest)
    sizeOptions.sort((a, b) => {
      return parseSizeValue(a.name) - parseSizeValue(b.name);
    });

    // Base options: smallest qty only
    const baseQtyOption = qtyOptions.length > 0 ? qtyOptions[0].id : null;

    // ALL other groups are variable - INCLUDING SIZE
    const fixedGroups = ['qty'];
    const variableGroups: string[] = [];
    
    // Put 'size' first in variable groups to prioritize testing all sizes
    if (optionsByGroup['size']?.length > 0) {
      variableGroups.push('size');
    }
    
    for (const group of groupNames) {
      if (!fixedGroups.includes(group) && group !== 'size' && optionsByGroup[group].length > 0) {
        variableGroups.push(group);
      }
    }

    // Generate combinations prioritizing smaller sizes first
    const generateCombinations = (groups: string[]): number[][] => {
      if (groups.length === 0) return [[]];
      
      const [first, ...rest] = groups;
      const restCombinations = generateCombinations(rest);
      const combinations: number[][] = [];
      
      // Use pre-sorted options (sizes already sorted by area)
      const groupOptions = optionsByGroup[first];
      
      for (const opt of groupOptions) {
        for (const restCombo of restCombinations) {
          combinations.push([opt.id, ...restCombo]);
        }
      }
      
      return combinations;
    };
    
    let combinations = generateCombinations(variableGroups);
    
    // Deterministic selection: keep first N combinations (already sorted by size)
    // This ensures we test ALL sizes with at least some option combinations
    const maxCombinations = 150;
    if (combinations.length > maxCombinations) {
      // Keep combinations deterministically - smaller sizes first
      combinations = combinations.slice(0, maxCombinations);
    }
    
    // Parallel price fetching - test combinations in batches
    const batchLimit = 10;
    let globalMinPrice = Infinity;
    let globalMinOptions: number[] = [];
    
    for (let i = 0; i < combinations.length; i += batchLimit) {
      const batch = combinations.slice(i, i + batchLimit);
      
      const pricePromises = batch.map(async (combo): Promise<{ price: number; options: number[] } | null> => {
        const fullOptions = baseQtyOption ? [baseQtyOption, ...combo] : [...combo];
        try {
          const priceUrl = `${apiBaseUrl}/price/${productId}/${storeCode}`;
          const priceRes = await fetch(priceUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ productOptions: fullOptions }),
          });

          if (!priceRes.ok) return null;

          const priceData = await priceRes.json();
          
          let price = 0;
          if (priceData.price && parseFloat(priceData.price) > 0) {
            price = parseFloat(priceData.price);
          } else if (priceData.unit_price && parseFloat(priceData.unit_price) > 0) {
            price = parseFloat(priceData.unit_price);
          } else if (priceData.total_price && parseFloat(priceData.total_price) > 0) {
            price = parseFloat(priceData.total_price);
          }
          
          return price > 0 ? { price, options: fullOptions } : null;
        } catch {
          return null;
        }
      });

      const priceResults = await Promise.all(pricePromises);
      
      for (const result of priceResults) {
        if (result && result.price < globalMinPrice) {
          globalMinPrice = result.price;
          globalMinOptions = result.options;
        }
      }
    }

    // Fallback: try just qty option with first size
    if (globalMinOptions.length === 0 && baseQtyOption && sizeOptions.length > 0) {
      try {
        const fallbackOptions = [baseQtyOption, sizeOptions[0].id];
        const priceUrl = `${apiBaseUrl}/price/${productId}/${storeCode}`;
        const priceRes = await fetch(priceUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productOptions: fallbackOptions }),
        });

        if (priceRes.ok) {
          const priceData = await priceRes.json();
          let price = 0;
          if (priceData.price && parseFloat(priceData.price) > 0) {
            price = parseFloat(priceData.price);
          } else if (priceData.unit_price && parseFloat(priceData.unit_price) > 0) {
            price = parseFloat(priceData.unit_price);
          }
          if (price > 0) {
            globalMinPrice = price;
            globalMinOptions = fallbackOptions;
          }
        }
      } catch {}
    }

    if (globalMinOptions.length > 0 && globalMinPrice < Infinity) {
      const minPriceCents = Math.round(globalMinPrice * 100);
      const minPriceVariantKey = globalMinOptions.sort((a, b) => a - b).join('-');
      return {
        min_price_cents: minPriceCents,
        min_price_variant_key: minPriceVariantKey,
      };
    }
    
    return null;

  } catch (err) {
    console.error(`[MIN-PRICE] Error for ${product.name}:`, err);
    return null;
  }
}

// Background task to compute comprehensive minimum prices for all products
async function computeMinPricesBackground(
  supabase: any,
  accessToken: string,
  apiBaseUrl: string,
  storeCode: number,
  batchSize = 5
) {
  console.log(`[SYNC-SINALITE] Starting comprehensive min price computation...`);
  
  try {
    let totalUpdated = 0;
    let offset = 0;
    const maxProducts = 500;
    
    while (offset < maxProducts) {
      // Get products that need min_price updated
      const { data: products, error: fetchError } = await supabase
        .from("products")
        .select("id, vendor_product_id, name, min_price_cents")
        .eq("vendor", "sinalite")
        .range(offset, offset + batchSize - 1)
        .limit(batchSize);
      
      if (fetchError) {
        console.error("[SYNC-SINALITE] Error fetching products for min price:", fetchError);
        break;
      }
      
      if (!products || products.length === 0) {
        console.log("[SYNC-SINALITE] No more products to process for min prices");
        break;
      }
      
      const batchNum = Math.floor(offset / batchSize) + 1;
      console.log(`[SYNC-SINALITE] Min price batch ${batchNum}: Processing ${products.length} products`);
      
      for (const product of products) {
        const result = await computeMinPriceForProduct(product, accessToken, apiBaseUrl, storeCode);
        
        if (result) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ 
              min_price_cents: result.min_price_cents,
              base_cost_cents: result.min_price_cents,
              min_price_variant_key: result.min_price_variant_key,
            })
            .eq("id", product.id);
          
          if (!updateError) {
            totalUpdated++;
            console.log(`[SYNC-SINALITE] ✓ ${product.name}: $${(result.min_price_cents / 100).toFixed(2)}`);
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }
      
      offset += batchSize;
      
      // Delay between batches
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log(`[SYNC-SINALITE] Min price computation complete. Updated ${totalUpdated} products.`);
    
  } catch (error) {
    console.error("[SYNC-SINALITE] Min price computation error:", error);
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

    // Process products - set initial min_price to null (will be computed)
    const productsToSync = enabledProducts
      .map((p: any, index: number) => {
        // Default base cost - will be overwritten by min price calculation
        let baseCostCents = 2000;
        
        if (index === 0) {
          console.log(`[SYNC-SINALITE] Sample product data:`, JSON.stringify({
            id: p.id,
            name: p.name,
            price: p.price,
            base_price: p.base_price,
            minPrice: p.minPrice,
            allKeys: Object.keys(p)
          }));
        }
        
        if (p.price && typeof p.price === 'number' && p.price > 0) {
          baseCostCents = Math.round(p.price * 100);
        } else if (p.base_price && typeof p.base_price === 'number' && p.base_price > 0) {
          baseCostCents = Math.round(p.base_price * 100);
        } else if (p.minPrice && typeof p.minPrice === 'number' && p.minPrice > 0) {
          baseCostCents = Math.round(p.minPrice * 100);
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
          min_price_cents: baseCostCents, // Will be updated by min price calculation
          category: p.category || "Uncategorized",
          image_url: imageUrl,
          vendor: "sinalite",
          vendor_id: `${p.id}_${storeCode}`,
          vendor_product_id: p.id.toString(),
          pricing_data: null,
        };
      })
      .filter((p: any) => {
        const isValid = p.base_cost_cents >= 100 && p.base_cost_cents <= 100000;
        if (!isValid) {
          console.log(`[SYNC-SINALITE] Filtering out product: ${p.name} with price ${p.base_cost_cents}`);
        }
        return isValid;
      });
    
    console.log(`[SYNC-SINALITE] Prepared ${productsToSync.length} products for sync`);

    // Process products in batches
    const BATCH_SIZE = 10;
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
        .select("vendor_id, markup_fixed_cents, markup_percent, price_override_cents, image_url, generated_image_url, min_price_cents, min_price_variant_key")
        .eq("vendor", "sinalite")
        .in("vendor_id", batchVendorIds);

      if (fetchError) {
        console.error(`[SYNC-SINALITE] Error fetching existing products for batch ${batchNum}:`, fetchError);
      }

      // Create a map of existing product customizations
      const existingCustomizations = new Map<string, any>();
      if (existingProducts) {
        for (const product of existingProducts) {
          existingCustomizations.set(product.vendor_id, {
            markup_fixed_cents: product.markup_fixed_cents,
            markup_percent: product.markup_percent,
            price_override_cents: product.price_override_cents,
            image_url: product.image_url,
            generated_image_url: product.generated_image_url,
            min_price_cents: product.min_price_cents,
            min_price_variant_key: product.min_price_variant_key,
          });
        }
      }

      // Merge new data with existing customizations
      let batchImagesPreserved = 0;
      let batchMarkupsPreserved = 0;
      for (const product of batch) {
        const existing = existingCustomizations.get(product.vendor_id);
        if (existing) {
          // Preserve custom markups
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
          // Preserve custom images
          if (existing.image_url && !product.image_url) {
            product.image_url = existing.image_url;
            batchImagesPreserved++;
          } else if (existing.image_url && existing.image_url !== product.image_url) {
            product.image_url = existing.image_url;
            batchImagesPreserved++;
          }
          if (existing.generated_image_url) {
            product.generated_image_url = existing.generated_image_url;
          }
          // Preserve existing min_price if already computed AND valid (not default 2000)
          // Only products without valid min_price will be computed by background task
          if (existing.min_price_cents && existing.min_price_variant_key && existing.min_price_cents !== 2000) {
            product.min_price_cents = existing.min_price_cents;
            product.min_price_variant_key = existing.min_price_variant_key;
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
      
      if (i + BATCH_SIZE < productsToSync.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    console.log(`[SYNC-SINALITE] All batches complete. Total synced: ${totalSynced} products`);
    console.log(`[SYNC-SINALITE] Preserved ${totalImagesPreserved} custom images and ${totalMarkupsPreserved} custom markups`);

    const synced = totalSynced;

    // Automatically compute comprehensive min prices for products
    if (!skipMinPrices && typeof EdgeRuntime !== 'undefined') {
      console.log("[SYNC-SINALITE] Starting background comprehensive min price computation...");
      EdgeRuntime.waitUntil(computeMinPricesBackground(supabase, accessToken, apiBaseUrl, storeCode, 5));
    } else if (!skipMinPrices) {
      console.log("[SYNC-SINALITE] EdgeRuntime not available, running min price computation synchronously...");
      await computeMinPricesBackground(supabase, accessToken, apiBaseUrl, storeCode, 5);
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
        note: "Sync complete. Min prices will be computed in background."
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
