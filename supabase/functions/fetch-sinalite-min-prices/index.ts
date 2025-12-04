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
    const batchSize = body.batchSize || body.limit || 20;
    const storeCode = body.storeCode || 9;
    const forceRefresh = body.forceRefresh || false;
    const offset = body.offset || 0; // Track pagination offset

    console.log(`[FETCH-MIN-PRICES] Starting comprehensive min price fetch for batch of ${batchSize} products`);

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
      .eq("vendor", "sinalite")
      .order("id"); // Consistent ordering for pagination
    
    if (!forceRefresh) {
      query = query.or("min_price_cents.eq.2000,min_price_cents.is.null");
    }
    
    // Use range for proper pagination with forceRefresh
    const { data: products, error: fetchError } = await query.range(offset, offset + batchSize - 1);

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

    console.log(`[FETCH-MIN-PRICES] Processing ${products.length} products with COMPREHENSIVE option testing`);

    // Process a single product - test ALL configuration options
    async function processProduct(product: any): Promise<{ id: string; min_price_cents: number; base_cost_cents: number; min_price_variant_key: string } | null> {
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
          console.error(`[FETCH-MIN-PRICES] Options fetch failed for ${product.name}`);
          return null;
        }

        const optionsData = await optionsRes.json();
        
        if (!Array.isArray(optionsData) || optionsData.length < 1) {
          console.error(`[FETCH-MIN-PRICES] Invalid options response for ${product.name}`);
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
        console.log(`[FETCH-MIN-PRICES] ${product.name} has groups: ${groupNames.join(', ')}`);

        // Sort qty options to use smallest as base
        const qtyOptions = optionsByGroup['qty'] || [];
        const sizeOptions = optionsByGroup['size'] || [];

        qtyOptions.sort((a, b) => {
          const numA = parseInt(a.name) || 999999;
          const numB = parseInt(b.name) || 999999;
          return numA - numB;
        });

        // Base options: smallest qty only - we'll test ALL sizes
        const baseQtyOption = qtyOptions.length > 0 ? qtyOptions[0].id : null;

        // ALL other groups are variable - INCLUDING SIZE!
        // This ensures we test all sizes to find the true minimum
        const fixedGroups = ['qty']; // Only qty is fixed (smallest)
        const variableGroups: string[] = [];
        
        for (const group of groupNames) {
          if (!fixedGroups.includes(group) && optionsByGroup[group].length > 0) {
            variableGroups.push(group);
          }
        }

        console.log(`[FETCH-MIN-PRICES] ${product.name} variable groups (including size): ${variableGroups.join(', ')}`);

        // Generate ALL combinations across variable groups (including all sizes)
        const generateCombinations = (groups: string[]): number[][] => {
          if (groups.length === 0) return [[]];
          
          const [first, ...rest] = groups;
          const restCombinations = generateCombinations(rest);
          const combinations: number[][] = [];
          
          // Test ALL options in this group
          const groupOptions = optionsByGroup[first];
          
          for (const opt of groupOptions) {
            for (const restCombo of restCombinations) {
              combinations.push([opt.id, ...restCombo]);
            }
          }
          
          return combinations;
        };
        
        // Generate all combinations
        let combinations = generateCombinations(variableGroups);
        
        // Log total combinations count
        console.log(`[FETCH-MIN-PRICES] ${product.name}: ${combinations.length} total combinations to test`);
        
        // Cap combinations to prevent timeout (max 50 for faster processing)
        const maxCombinations = 50;
        if (combinations.length > maxCombinations) {
          console.log(`[FETCH-MIN-PRICES] ${product.name}: capping at ${maxCombinations} combinations`);
          // Shuffle to get random sample across all options
          combinations = combinations.sort(() => Math.random() - 0.5).slice(0, maxCombinations);
        }
        
        // PARALLEL price fetching - test combinations in larger batches
        const batchLimit = 30;
        let globalMinPrice = Infinity;
        let globalMinOptions: number[] = [];
        
        for (let i = 0; i < combinations.length; i += batchLimit) {
          const batch = combinations.slice(i, i + batchLimit);
          
          const pricePromises = batch.map(async (combo): Promise<{ price: number; options: number[] } | null> => {
            // Add base qty option if it exists
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
          
          // Find minimum in this batch
          for (const result of priceResults) {
            if (result && result.price < globalMinPrice) {
              globalMinPrice = result.price;
              globalMinOptions = result.options;
            }
          }
        }

        // If no combinations worked, try just qty option with first size
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
          console.log(`[FETCH-MIN-PRICES] ✓ ${product.name}: $${globalMinPrice.toFixed(2)} (tested ${combinations.length} combinations)`);
          return {
            id: product.id,
            min_price_cents: minPriceCents,
            base_cost_cents: minPriceCents,
            min_price_variant_key: minPriceVariantKey,
          };
        } else {
          console.log(`[FETCH-MIN-PRICES] ✗ ${product.name}: no valid price found`);
          return null;
        }

      } catch (err) {
        console.error(`[FETCH-MIN-PRICES] Error for ${product.name}:`, err);
        return null;
      }
    }

    // Process products sequentially (one at a time to handle many API calls per product)
    const updates: { id: string; min_price_cents: number; base_cost_cents: number; min_price_variant_key: string }[] = [];
    
    for (const product of products) {
      const result = await processProduct(product);
      if (result) {
        updates.push(result);
      }
    }

    // Batch update products
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

      if (!updateError) {
        updated++;
      }
    }

    // Count remaining products
    let remainingCount = 0;
    let totalCount = 0;
    
    const { count: total } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor", "sinalite");
    totalCount = total || 0;
    
    if (forceRefresh) {
      // For force refresh, remaining = total - (offset + processed in this batch)
      remainingCount = Math.max(0, totalCount - offset - products.length);
    } else {
      const { count: remaining } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("vendor", "sinalite")
        .or("min_price_cents.eq.2000,min_price_cents.is.null");
      remainingCount = remaining || 0;
    }

    console.log(`[FETCH-MIN-PRICES] Done: ${updated} updated, ${remainingCount} remaining (offset=${offset}, forceRefresh=${forceRefresh})`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: products.length,
        updated,
        errors: products.length - updates.length,
        remaining: remainingCount,
        nextOffset: offset + products.length, // Return next offset for pagination
        total: totalCount,
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
