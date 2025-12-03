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

    console.log(`[FETCH-MIN-PRICES] Starting optimized min price fetch for batch of ${batchSize} products`);

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

    console.log(`[FETCH-MIN-PRICES] Processing ${products.length} products with PARALLEL testing`);

    // Process a single product - optimized for speed
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
        
        // Group options by category
        const optionsByGroup: Record<string, { id: number; name: string }[]> = {};
        for (const opt of options) {
          const group = opt.group || 'other';
          if (!optionsByGroup[group]) {
            optionsByGroup[group] = [];
          }
          optionsByGroup[group].push({ id: opt.id, name: opt.name });
        }

        const groupNames = Object.keys(optionsByGroup);

        // Get base options (smallest qty, size, standard turnaround)
        const qtyOptions = optionsByGroup['qty'] || [];
        const sizeOptions = optionsByGroup['size'] || [];
        const turnaroundOptions = optionsByGroup['Turnaround'] || [];

        qtyOptions.sort((a, b) => {
          const numA = parseInt(a.name) || 999999;
          const numB = parseInt(b.name) || 999999;
          return numA - numB;
        });

        sizeOptions.sort((a, b) => {
          const parseSize = (name: string) => {
            const match = name.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
            if (match) return parseFloat(match[1]) * parseFloat(match[2]);
            return 999999;
          };
          return parseSize(a.name) - parseSize(b.name);
        });

        const standardTurnaround = turnaroundOptions.find(t => 
          t.name.includes('4 - 5') || t.name.includes('4 - 6') || t.name.includes('Standard')
        ) || turnaroundOptions[0];

        const baseOptions: number[] = [];
        if (qtyOptions.length > 0) baseOptions.push(qtyOptions[0].id);
        if (sizeOptions.length > 0) baseOptions.push(sizeOptions[0].id);
        if (standardTurnaround) baseOptions.push(standardTurnaround.id);

        // Get variable groups (not qty, size, turnaround)
        const fixedGroups = ['qty', 'size', 'Turnaround'];
        const variableGroups: string[] = [];
        
        for (const group of groupNames) {
          if (!fixedGroups.includes(group) && optionsByGroup[group].length > 0) {
            variableGroups.push(group);
          }
        }

        // Generate combinations (limit to 2 options per variable group for speed)
        const generateCombinations = (groups: string[]): number[][] => {
          if (groups.length === 0) return [[]];
          
          const [first, ...rest] = groups;
          const restCombinations = generateCombinations(rest);
          const combinations: number[][] = [];
          
          // Limit to first 2 options per group
          const groupOptions = optionsByGroup[first].slice(0, 2);
          
          for (const opt of groupOptions) {
            for (const restCombo of restCombinations) {
              combinations.push([opt.id, ...restCombo]);
            }
          }
          
          return combinations;
        };

        const combinations = generateCombinations(variableGroups);
        
        // PARALLEL price fetching - test all combinations at once
        const pricePromises = combinations.map(async (combo): Promise<{ price: number; options: number[] } | null> => {
          const fullOptions = [...baseOptions, ...combo];
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
        
        // Find minimum
        let globalMinPrice = Infinity;
        let globalMinOptions: number[] = [];
        
        for (const result of priceResults) {
          if (result && result.price < globalMinPrice) {
            globalMinPrice = result.price;
            globalMinOptions = result.options;
          }
        }

        // If no combinations worked, try base options only
        if (globalMinOptions.length === 0 && baseOptions.length > 0) {
          try {
            const priceUrl = `${apiBaseUrl}/price/${productId}/${storeCode}`;
            const priceRes = await fetch(priceUrl, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ productOptions: baseOptions }),
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
                globalMinOptions = baseOptions;
              }
            }
          } catch {}
        }

        if (globalMinOptions.length > 0 && globalMinPrice < Infinity) {
          const minPriceCents = Math.round(globalMinPrice * 100);
          const minPriceVariantKey = globalMinOptions.sort((a, b) => a - b).join('-');
          console.log(`[FETCH-MIN-PRICES] ✓ ${product.name}: $${globalMinPrice.toFixed(2)}`);
          return {
            id: product.id,
            min_price_cents: minPriceCents,
            base_cost_cents: minPriceCents,
            min_price_variant_key: minPriceVariantKey,
          };
        } else {
          console.log(`[FETCH-MIN-PRICES] ✗ ${product.name}: no valid price`);
          return null;
        }

      } catch (err) {
        console.error(`[FETCH-MIN-PRICES] Error for ${product.name}:`, err);
        return null;
      }
    }

    // Process products in parallel (3 at a time to avoid rate limits)
    const updates: { id: string; min_price_cents: number; base_cost_cents: number; min_price_variant_key: string }[] = [];
    const parallelLimit = 3;
    
    for (let i = 0; i < products.length; i += parallelLimit) {
      const batch = products.slice(i, i + parallelLimit);
      const results = await Promise.all(batch.map(p => processProduct(p)));
      
      for (const result of results) {
        if (result) {
          updates.push(result);
        }
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
