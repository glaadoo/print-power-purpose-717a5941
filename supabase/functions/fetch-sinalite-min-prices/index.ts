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
    const batchSize = body.batchSize || 5; // Process 5 products at a time (reduced due to multiple API calls per product)
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

    const updates: { id: string; min_price_cents: number; base_cost_cents: number; min_price_variant_key: string }[] = [];
    let errors = 0;

    // Fetch min price for each product by getting options and calculating prices
    for (const product of products) {
      try {
        const productId = product.vendor_product_id;
        
        console.log(`[FETCH-MIN-PRICES] Fetching options for ${product.name} (${productId})`);
        
        // Step 1: Get product configuration options
        const optionsUrl = `${apiBaseUrl}/product/${productId}/${storeCode}`;
        const optionsRes = await fetch(optionsUrl, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!optionsRes.ok) {
          console.error(`[FETCH-MIN-PRICES] Options fetch failed for ${productId}: ${optionsRes.status}`);
          errors++;
          continue;
        }

        const optionsData = await optionsRes.json();
        
        // Parse options - response is [options[], combinations[], metadata[]]
        if (!Array.isArray(optionsData) || optionsData.length < 1) {
          console.error(`[FETCH-MIN-PRICES] Invalid options response for ${productId}`);
          errors++;
          continue;
        }

        const options = optionsData[0] || [];
        
        // Group options by category
        const optionsByGroup: Record<string, { id: number; name: string }[]> = {};
        for (const opt of options) {
          const group = opt.group || 'other';
          if (!optionsByGroup[group]) {
            optionsByGroup[group] = [];
          }
          optionsByGroup[group].push({ id: opt.id, name: opt.name });
        }

        console.log(`[FETCH-MIN-PRICES] ${product.name} has groups: ${Object.keys(optionsByGroup).join(', ')}`);

        // Step 2: Find minimum qty and size options (smallest values typically = lowest price)
        const qtyOptions = optionsByGroup['qty'] || [];
        const sizeOptions = optionsByGroup['size'] || [];
        const turnaroundOptions = optionsByGroup['Turnaround'] || [];

        // Sort qty options to find smallest
        qtyOptions.sort((a, b) => {
          const numA = parseInt(a.name) || 999999;
          const numB = parseInt(b.name) || 999999;
          return numA - numB;
        });

        // Sort size options to find smallest (by area if possible)
        sizeOptions.sort((a, b) => {
          const parseSize = (name: string) => {
            const match = name.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
            if (match) {
              return parseFloat(match[1]) * parseFloat(match[2]);
            }
            return 999999;
          };
          return parseSize(a.name) - parseSize(b.name);
        });

        // Find standard turnaround (usually cheapest)
        const standardTurnaround = turnaroundOptions.find(t => 
          t.name.includes('2 - 4') || t.name.includes('Standard') || t.name.includes('Business Days')
        ) || turnaroundOptions[0];

        // Build minimum configuration
        const minOptions: number[] = [];
        
        if (qtyOptions.length > 0) {
          minOptions.push(qtyOptions[0].id);
          console.log(`[FETCH-MIN-PRICES] Using min qty: ${qtyOptions[0].name} (id: ${qtyOptions[0].id})`);
        }
        
        if (sizeOptions.length > 0) {
          minOptions.push(sizeOptions[0].id);
          console.log(`[FETCH-MIN-PRICES] Using min size: ${sizeOptions[0].name} (id: ${sizeOptions[0].id})`);
        }
        
        if (standardTurnaround) {
          minOptions.push(standardTurnaround.id);
          console.log(`[FETCH-MIN-PRICES] Using turnaround: ${standardTurnaround.name} (id: ${standardTurnaround.id})`);
        }

        // Add any other required groups (first option of each)
        for (const [group, opts] of Object.entries(optionsByGroup)) {
          if (group !== 'qty' && group !== 'size' && group !== 'Turnaround' && opts.length > 0) {
            minOptions.push(opts[0].id);
          }
        }

        if (minOptions.length === 0) {
          console.error(`[FETCH-MIN-PRICES] No options found for ${productId}`);
          errors++;
          continue;
        }

        // Step 3: Call POST /price to get actual price
        const priceUrl = `${apiBaseUrl}/price/${productId}/${storeCode}`;
        const priceRes = await fetch(priceUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productOptions: minOptions }),
        });

        if (!priceRes.ok) {
          console.error(`[FETCH-MIN-PRICES] Price fetch failed for ${productId}: ${priceRes.status}`);
          errors++;
          continue;
        }

        const priceData = await priceRes.json();
        console.log(`[FETCH-MIN-PRICES] Price response for ${product.name}:`, JSON.stringify(priceData));

        // Extract price from response
        let price = 0;
        if (priceData.price && parseFloat(priceData.price) > 0) {
          price = parseFloat(priceData.price);
        } else if (priceData.unit_price && parseFloat(priceData.unit_price) > 0) {
          price = parseFloat(priceData.unit_price);
        } else if (priceData.total_price && parseFloat(priceData.total_price) > 0) {
          price = parseFloat(priceData.total_price);
        }

        if (price > 0) {
          const minPriceCents = Math.round(price * 100);
          // Generate variant key from sorted option IDs
          const minPriceVariantKey = minOptions.sort((a, b) => a - b).join('-');
          console.log(`[FETCH-MIN-PRICES] ${product.name}: min price = $${price.toFixed(2)} (${minPriceCents} cents), variant key: ${minPriceVariantKey}`);
          updates.push({
            id: product.id,
            min_price_cents: minPriceCents,
            base_cost_cents: minPriceCents,
            min_price_variant_key: minPriceVariantKey,
          });
        } else {
          console.log(`[FETCH-MIN-PRICES] ${product.name}: no valid price found in response`);
          errors++;
        }

        // Delay between products to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
        
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
          base_cost_cents: update.base_cost_cents,
          min_price_variant_key: update.min_price_variant_key,
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
