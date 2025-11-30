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
    console.log("[SYNC-SCALABLEPRESS] Starting fast product sync");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const apiKey = Deno.env.get("SCALABLEPRESS_API_KEY");
    const apiUrl = "https://api.scalablepress.com/v2";

    if (!apiKey) {
      console.error("[SYNC-SCALABLEPRESS] Missing SCALABLEPRESS_API_KEY");
      return new Response(
        JSON.stringify({ success: false, error: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Step 1: Fetch all categories in parallel
    console.log("[SYNC-SCALABLEPRESS] Fetching categories");
    const categoriesResponse = await fetch(`${apiUrl}/categories`, {
      headers: {
        "Authorization": `Basic ${btoa(":" + apiKey)}`,
        "Accept": "application/json",
      },
    });

    if (!categoriesResponse.ok) {
      const errorText = await categoriesResponse.text();
      console.error("[SYNC-SCALABLEPRESS] Categories API error:", categoriesResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Categories fetch failed: ${categoriesResponse.status}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const categories = await categoriesResponse.json();
    console.log(`[SYNC-SCALABLEPRESS] Found ${categories.length} categories`);

    // Step 2: Fetch all category products in PARALLEL (much faster!)
    const categoryFetches = categories.map(async (category: any) => {
      try {
        const response = await fetch(`${apiUrl}/categories/${category.categoryId}`, {
          headers: {
            "Authorization": `Basic ${btoa(":" + apiKey)}`,
            "Accept": "application/json",
          },
        });
        if (!response.ok) return { category, products: [] };
        const data = await response.json();
        return { category, products: data.products || [] };
      } catch {
        return { category, products: [] };
      }
    });

    const categoryResults = await Promise.all(categoryFetches);
    
    // Step 3: Collect all products into a single array
    const allProducts: any[] = [];
    for (const { category, products } of categoryResults) {
      for (const product of products) {
        allProducts.push({
          name: product.name || "Unnamed Product",
          category: category.name || "apparel",
          image_url: product.image?.url || null,
          description: null,
          vendor: "scalablepress",
          vendor_id: product.id,
          vendor_product_id: product.id,
          is_active: true,
          base_cost_cents: 1000, // Default, will be updated by fetch-prices
          pricing_data: {
            style: product.style,
            categoryId: category.categoryId,
            categoryType: category.type,
            productUrl: product.url,
          }
        });
      }
    }

    console.log(`[SYNC-SCALABLEPRESS] Collected ${allProducts.length} products, batch upserting...`);

    // Step 4: Batch upsert in chunks of 500 (very fast!)
    const batchSize = 500;
    let totalSynced = 0;
    let totalErrors = 0;

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      const { error } = await supabase
        .from("products")
        .upsert(batch, { 
          onConflict: "vendor,vendor_id",
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`[SYNC-SCALABLEPRESS] Batch upsert error:`, error);
        totalErrors += batch.length;
      } else {
        totalSynced += batch.length;
      }
    }

    console.log(`[SYNC-SCALABLEPRESS] Sync complete: ${totalSynced} synced, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: totalSynced, 
        total: allProducts.length,
        errors: totalErrors,
        message: `Synced ${totalSynced} products. Run 'Fetch Product Prices' to update prices.`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[SYNC-SCALABLEPRESS] Fatal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
