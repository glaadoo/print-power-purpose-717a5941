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
    const batchSize = body.batchSize || 10;
    const storeCode = body.storeCode || 9;
    const forceRefresh = body.forceRefresh || false;

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
      .eq("vendor", "sinalite");
    
    if (!forceRefresh) {
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

        // All groups except qty (which we pick smallest) and size (which we iterate)
        const variableGroups = groupNames.filter(g => g !== 'qty' && g !== 'size');
        
        console.log(`[FETCH-MIN-PRICES] ${product.name} - sizes: ${sizeOptions.length}, variable groups: ${variableGroups.join(', ')}`);

        // Build base options: smallest qty + first option from each variable group
        const baseOptions: number[] = [];
        if (qtyOptions.length > 0) {
          baseOptions.push(qtyOptions[0].id);
        }
        for (const group of variableGroups) {
          if (optionsByGroup[group].length > 0) {
            baseOptions.push(optionsByGroup[group][0].id);
          }
        }

        // Build combinations: test EVERY size with base options from all other groups
        const combinations: number[][] = [];
        
        // Test ALL sizes with default options from all groups
        for (const sizeOpt of sizeOptions) {
          combinations.push([...baseOptions, sizeOpt.id]);
        }
        
        // If no size options, just test with base options
        if (sizeOptions.length === 0 && baseOptions.length > 0) {
          combinations.push([...baseOptions]);
        }
        
        console.log(`[FETCH-MIN-PRICES] ${product.name}: testing ${combinations.length} combinations`);
        
        // Log first combination for debugging
        if (combinations.length > 0) {
          console.log(`[FETCH-MIN-PRICES] ${product.name} first combo: [${combinations[0].join(', ')}]`);
        }
        
        const finalCombinations = combinations;
        
        // PARALLEL price fetching - test all combinations
        // Batch into groups of 20 to avoid overwhelming the API
        const batchLimit = 20;
        let globalMinPrice = Infinity;
        let globalMinOptions: number[] = [];
        
        for (let i = 0; i < finalCombinations.length; i += batchLimit) {
          const batch = finalCombinations.slice(i, i + batchLimit);
          
          const pricePromises = batch.map(async (combo): Promise<{ price: number; options: number[] } | null> => {
            // combo already includes all required options (qty, size, all variable groups)
            const fullOptions = [...combo];
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
              
              // Extract price from various possible response fields
              let price = 0;
              
              // Try direct price fields
              const priceFields = ['price', 'unit_price', 'total_price', 'unitPrice', 'totalPrice', 'basePrice', 'base_price', 'amount'];
              for (const field of priceFields) {
                if (priceData[field] && parseFloat(priceData[field]) > 0) {
                  price = parseFloat(priceData[field]);
                  break;
                }
              }
              
              // Try nested price object
              if (price === 0 && priceData.pricing) {
                for (const field of priceFields) {
                  if (priceData.pricing[field] && parseFloat(priceData.pricing[field]) > 0) {
                    price = parseFloat(priceData.pricing[field]);
                    break;
                  }
                }
              }
              
              // Try data wrapper
              if (price === 0 && priceData.data) {
                for (const field of priceFields) {
                  if (priceData.data[field] && parseFloat(priceData.data[field]) > 0) {
                    price = parseFloat(priceData.data[field]);
                    break;
                  }
                }
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

        // If no combinations worked, try fallback approaches
        if (globalMinOptions.length === 0) {
          console.log(`[FETCH-MIN-PRICES] ${product.name}: trying fallback approaches`);
          
          // Try with base options + first size
          if (baseOptions.length > 0 && sizeOptions.length > 0) {
            try {
              const fallbackOptions = [...baseOptions, sizeOptions[0].id];
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
                console.log(`[FETCH-MIN-PRICES] ${product.name} fallback response:`, JSON.stringify(priceData).substring(0, 500));
                
                let price = 0;
                const priceFields = ['price', 'unit_price', 'total_price', 'unitPrice', 'totalPrice', 'basePrice', 'base_price', 'amount'];
                for (const field of priceFields) {
                  if (priceData[field] && parseFloat(priceData[field]) > 0) {
                    price = parseFloat(priceData[field]);
                    break;
                  }
                }
                if (price > 0) {
                  globalMinPrice = price;
                  globalMinOptions = fallbackOptions;
                }
              }
            } catch {}
          }
          
          // Try pricebykey endpoint with variant key from database if still no price
          if (globalMinOptions.length === 0 && product.min_price_variant_key) {
            try {
              const keyUrl = `${apiBaseUrl}/pricebykey/${productId}/${product.min_price_variant_key}`;
              const keyRes = await fetch(keyUrl, {
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              });

              if (keyRes.ok) {
                const keyData = await keyRes.json();
                console.log(`[FETCH-MIN-PRICES] ${product.name} pricebykey response:`, JSON.stringify(keyData).substring(0, 500));
                
                let price = 0;
                const priceFields = ['price', 'unit_price', 'total_price', 'unitPrice', 'totalPrice', 'basePrice', 'base_price', 'amount'];
                for (const field of priceFields) {
                  if (keyData[field] && parseFloat(keyData[field]) > 0) {
                    price = parseFloat(keyData[field]);
                    break;
                  }
                }
                if (price > 0) {
                  globalMinPrice = price;
                  globalMinOptions = product.min_price_variant_key.split('-').map((s: string) => parseInt(s));
                }
              }
            } catch {}
          }
        }

        if (globalMinOptions.length > 0 && globalMinPrice < Infinity) {
          const minPriceCents = Math.round(globalMinPrice * 100);
          const minPriceVariantKey = globalMinOptions.sort((a, b) => a - b).join('-');
          console.log(`[FETCH-MIN-PRICES] ✓ ${product.name}: $${globalMinPrice.toFixed(2)} (tested ${finalCombinations.length} combinations)`);
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
    const { count: remaining } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor", "sinalite")
      .or("min_price_cents.eq.2000,min_price_cents.is.null");

    console.log(`[FETCH-MIN-PRICES] Done: ${updated} updated, ${remaining || 0} remaining`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: products.length,
        updated,
        errors: products.length - updates.length,
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
