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
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const batchSize = body.batchSize || 10; // Process 10 products at a time (reduced due to multiple API calls per product)
    const storeCode = body.storeCode || 9; // Default to US
    const forceRefresh = body.forceRefresh || false; // Force refresh all products

    console.log(`[FETCH-MIN-PRICES] Starting min price fetch for batch of ${batchSize} products, forceRefresh=${forceRefresh}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get Stripe mode for API credentials
    let sinaliteMode = "test";
    try {
      const { data: settingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'stripe_mode')
        .single();
      sinaliteMode = settingData?.value || "test";
    } catch (error) {
      console.error('[FETCH-MIN-PRICES] Failed to fetch mode:', error);
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
    const apiBaseUrl = sinaliteMode === "live"
      ? "https://liveapi.sinalite.com"
      : "https://api.sinaliteuppy.com";
    const audience = sinaliteMode === "live"
      ? Deno.env.get("SINALITE_AUDIENCE_LIVE")
      : Deno.env.get("SINALITE_AUDIENCE_TEST");

    if (!clientId || !clientSecret || !authUrl || !audience) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing SinaLite credentials" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Authenticate
    const authRes = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: audience,
        grant_type: "client_credentials",
      }),
    });

    if (!authRes.ok) {
      throw new Error(`Auth failed: ${authRes.status}`);
    }

    const authData = await authRes.json();
    const accessToken = authData.access_token;
    if (!accessToken) {
      throw new Error("No access token received");
    }

    // Get products that need min_price updated
    let query = supabase
      .from("products")
      .select("id, vendor_product_id, name, min_price_cents, base_cost_cents")
      .eq("vendor", "sinalite");
    
    if (!forceRefresh) {
      // Only get products with default $20.00 or null
      query = query.or("min_price_cents.eq.2000,min_price_cents.is.null");
    }
    
    const { data: products, error: fetchError } = await query.limit(batchSize);

    if (fetchError) {
      throw fetchError;
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "All products already have min prices",
          updated: 0,
          remaining: 0 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[FETCH-MIN-PRICES] Processing ${products.length} products`);

    const updates: { id: string; min_price_cents: number; base_cost_cents: number }[] = [];
    let errors = 0;

    // Helper function to extract price from variant object
    const extractPrice = (variant: any): number | null => {
      // Try multiple possible price field names
      const price = variant.price ?? variant.unit_price ?? variant.base_price ?? variant.retail_price ?? variant.msrp;
      if (typeof price === 'number' && price > 0) {
        return price;
      }
      // Sometimes price is nested
      if (variant.pricing && typeof variant.pricing.price === 'number') {
        return variant.pricing.price;
      }
      return null;
    };

    // Fetch min price for each product using variants endpoint with pagination
    for (const product of products) {
      try {
        const productId = product.vendor_product_id;
        let minPrice = Infinity;
        let offset = 0;
        let hasMoreVariants = true;
        const maxPages = 20; // Safety limit - max 20,000 variants
        let pageCount = 0;
        
        console.log(`[FETCH-MIN-PRICES] Fetching ALL variants for ${product.name} (${productId})`);
        
        // Paginate through ALL variants
        while (hasMoreVariants && pageCount < maxPages) {
          const variantsUrl = `${apiBaseUrl}/variants/${productId}/${offset}`;
          
          const variantsRes = await fetch(variantsUrl, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!variantsRes.ok) {
            console.error(`[FETCH-MIN-PRICES] Variants fetch failed for ${productId} at offset ${offset}: ${variantsRes.status}`);
            break;
          }

          const variants = await variantsRes.json();
          let variantList: any[] = [];
          
          // Handle different response formats
          if (Array.isArray(variants)) {
            variantList = variants;
          } else if (variants && typeof variants === 'object') {
            variantList = variants.data || variants.variants || Object.values(variants);
            if (!Array.isArray(variantList)) {
              variantList = [];
            }
          }
          
          console.log(`[FETCH-MIN-PRICES] ${product.name} offset ${offset}: got ${variantList.length} variants`);
          
          // No more variants if we got an empty array or less than 1000
          if (variantList.length === 0) {
            hasMoreVariants = false;
            break;
          }
          
          // Find minimum price in this batch
          for (const variant of variantList) {
            const price = extractPrice(variant);
            if (price !== null && price < minPrice) {
              minPrice = price;
            }
          }
          
          // If we got less than 1000 variants, we've reached the end
          if (variantList.length < 1000) {
            hasMoreVariants = false;
          } else {
            offset += 1000;
          }
          
          pageCount++;
          
          // Small delay between pages to avoid rate limiting
          await new Promise(r => setTimeout(r, 50));
        }

        if (minPrice !== Infinity && minPrice > 0) {
          const minPriceCents = Math.round(minPrice * 100);
          console.log(`[FETCH-MIN-PRICES] ${product.name}: TRUE min price = $${minPrice.toFixed(2)} (${minPriceCents} cents) from ${pageCount} pages`);
          updates.push({
            id: product.id,
            min_price_cents: minPriceCents,
            base_cost_cents: minPriceCents,
          });
        } else {
          console.log(`[FETCH-MIN-PRICES] ${product.name}: no valid price found in any variants`);
        }

        // Delay between products to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
        
      } catch (err) {
        console.error(`[FETCH-MIN-PRICES] Error for ${product.name}:`, err);
        errors++;
      }
    }

    // Batch update products with new min prices
    let updated = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ 
          min_price_cents: update.min_price_cents,
          base_cost_cents: update.base_cost_cents 
        })
        .eq("id", update.id);

      if (updateError) {
        console.error(`[FETCH-MIN-PRICES] Update error for ${update.id}:`, updateError);
      } else {
        updated++;
      }
    }

    // Count remaining products needing updates
    const { count: remaining } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor", "sinalite")
      .or("min_price_cents.eq.2000,min_price_cents.is.null");

    console.log(`[FETCH-MIN-PRICES] Updated ${updated} products, ${errors} errors, ${remaining || 0} remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: products.length,
        updated,
        errors,
        remaining: remaining || 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[FETCH-MIN-PRICES] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
