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
    console.log("[FETCH-SCALABLEPRESS-PRICES] Starting batch price fetch");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const apiKey = Deno.env.get("SCALABLEPRESS_API_KEY");
    const apiUrl = "https://api.scalablepress.com/v2";

    if (!apiKey) {
      console.error("[FETCH-SCALABLEPRESS-PRICES] Missing SCALABLEPRESS_API_KEY");
      return new Response(
        JSON.stringify({ success: false, error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Parse request body for options
    let batchSize = 10;
    let forceRefresh = false;
    try {
      const body = await req.json();
      batchSize = body.batchSize || 10;
      forceRefresh = body.forceRefresh || false;
    } catch {
      // Use defaults
    }

    // Get products that need price updates
    // Either those with default price (1000 cents = $10) or all if forceRefresh
    let query = supabase
      .from("products")
      .select("id, vendor_product_id, name, base_cost_cents")
      .eq("vendor", "scalablepress");

    if (!forceRefresh) {
      // Only fetch products with default price or zero price
      query = query.or("base_cost_cents.eq.1000,base_cost_cents.eq.0,base_cost_cents.is.null");
    }

    const { data: products, error: fetchError } = await query.limit(batchSize);

    if (fetchError) {
      console.error("[FETCH-SCALABLEPRESS-PRICES] Error fetching products:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!products || products.length === 0) {
      console.log("[FETCH-SCALABLEPRESS-PRICES] No products need price updates");
      return new Response(
        JSON.stringify({ success: true, updated: 0, remaining: 0, message: "All prices up to date" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[FETCH-SCALABLEPRESS-PRICES] Processing ${products.length} products`);

    let updated = 0;
    let errors = 0;

    // Process each product and fetch its price
    for (const product of products) {
      try {
        const itemsResponse = await fetch(`${apiUrl}/products/${product.vendor_product_id}/items`, {
          headers: {
            "Authorization": `Basic ${btoa(":" + apiKey)}`,
            "Accept": "application/json",
          },
        });

        if (!itemsResponse.ok) {
          console.log(`[FETCH-SCALABLEPRESS-PRICES] Items API failed for ${product.vendor_product_id}: ${itemsResponse.status}`);
          errors++;
          continue;
        }

        const itemsData = await itemsResponse.json();
        
        // Extract first available price from items data
        // Structure: { "color": { "size": { price, quantity, weight, gtin } } }
        let priceInCents = 0;
        
        if (itemsData && typeof itemsData === 'object') {
          const colors = Object.values(itemsData);
          outerLoop:
          for (const colorSizes of colors) {
            if (colorSizes && typeof colorSizes === 'object') {
              const sizes = Object.values(colorSizes as object);
              for (const sizeData of sizes) {
                if (sizeData && typeof sizeData === 'object' && 'price' in sizeData) {
                  const price = (sizeData as any).price;
                  if (typeof price === 'number' && price > 0) {
                    // Scalable Press returns price in dollars, convert to cents
                    priceInCents = Math.round(price * 100);
                    break outerLoop;
                  }
                }
              }
            }
          }
        }

        if (priceInCents > 0) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ base_cost_cents: priceInCents })
            .eq("id", product.id);

          if (updateError) {
            console.error(`[FETCH-SCALABLEPRESS-PRICES] Update error for ${product.name}:`, updateError);
            errors++;
          } else {
            console.log(`[FETCH-SCALABLEPRESS-PRICES] Updated ${product.name}: $${(priceInCents / 100).toFixed(2)}`);
            updated++;
          }
        } else {
          console.log(`[FETCH-SCALABLEPRESS-PRICES] No price found for ${product.name}`);
          errors++;
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));

      } catch (err) {
        console.error(`[FETCH-SCALABLEPRESS-PRICES] Error processing ${product.name}:`, err);
        errors++;
      }
    }

    // Count remaining products that need updates
    const { count: remaining } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("vendor", "scalablepress")
      .or("base_cost_cents.eq.1000,base_cost_cents.eq.0,base_cost_cents.is.null");

    console.log(`[FETCH-SCALABLEPRESS-PRICES] Batch complete: ${updated} updated, ${errors} errors, ${remaining || 0} remaining`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated, 
        errors,
        processed: products.length,
        remaining: remaining || 0,
        message: remaining && remaining > 0 
          ? `Updated ${updated} prices. ${remaining} products still need prices.`
          : `All prices updated! ${updated} products processed.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[FETCH-SCALABLEPRESS-PRICES] Fatal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
