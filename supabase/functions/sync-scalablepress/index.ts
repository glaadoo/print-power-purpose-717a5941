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

  // Use streaming response to prevent client timeout
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendProgress = async (message: string, data?: any) => {
    const payload = JSON.stringify({ message, ...data, timestamp: new Date().toISOString() });
    await writer.write(encoder.encode(`data: ${payload}\n\n`));
  };

  // Start async processing
  (async () => {
    try {
      console.log("[SYNC-SCALABLEPRESS] Starting optimized product sync");
      await sendProgress("Starting Scalable Press sync...");

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const apiKey = Deno.env.get("SCALABLEPRESS_API_KEY");
      const apiUrl = "https://api.scalablepress.com/v2";

      if (!apiKey) {
        console.error("[SYNC-SCALABLEPRESS] Missing SCALABLEPRESS_API_KEY");
        await sendProgress("Error: API key not configured", { error: true, done: true });
        await writer.close();
        return;
      }

      // Step 1: Fetch categories
      await sendProgress("Fetching categories...");
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
        await sendProgress(`Error fetching categories: ${categoriesResponse.status}`, { error: true, done: true });
        await writer.close();
        return;
      }

      const categories = await categoriesResponse.json();
      await sendProgress(`Found ${categories.length} categories`, { categoriesCount: categories.length });
      console.log(`[SYNC-SCALABLEPRESS] Found ${categories.length} categories`);

      // Step 2: Fetch products for each category and upsert immediately
      // This approach: fetch category products -> upsert batch -> move to next category
      // Avoids accumulating 6300 products in memory and reduces API calls
      
      let totalSynced = 0;
      let totalErrors = 0;
      let totalProducts = 0;

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        await sendProgress(`Processing category ${i + 1}/${categories.length}: ${category.name}`, {
          progress: Math.round((i / categories.length) * 100)
        });
        
        try {
          const productsResponse = await fetch(`${apiUrl}/categories/${category.categoryId}`, {
            headers: {
              "Authorization": `Basic ${btoa(":" + apiKey)}`,
              "Accept": "application/json",
            },
          });

          if (!productsResponse.ok) {
            console.error(`[SYNC-SCALABLEPRESS] Failed to fetch category ${category.categoryId}`);
            continue;
          }

          const categoryData = await productsResponse.json();
          
          if (!categoryData.products || !Array.isArray(categoryData.products)) {
            continue;
          }

          const products = categoryData.products;
          totalProducts += products.length;

          // Process products in this category - use ONLY basic data from category response
          // Skip individual product API calls to avoid CPU timeout
          const productRecords = products.map((product: any) => {
            // Extract image URL from category listing data
            let imageUrl = null;
            if (product.image?.url) {
              imageUrl = product.image.url;
            }

            return {
              name: product.name || "Unnamed Product",
              base_cost_cents: 1000, // Default $10, will be fetched on-demand
              category: category.name || "apparel",
              image_url: imageUrl,
              description: null, // Will be fetched on-demand
              vendor: "scalablepress",
              vendor_id: product.id,
              vendor_product_id: product.id,
              is_active: true,
              pricing_data: {
                style: product.style,
                categoryId: category.categoryId,
                categoryType: category.type,
                productUrl: product.url,
                // Detailed pricing (colors, sizes, items) fetched on-demand in configurator
              }
            };
          });

          // Upsert products in batches of 50
          const batchSize = 50;
          for (let j = 0; j < productRecords.length; j += batchSize) {
            const batch = productRecords.slice(j, j + batchSize);
            
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

          console.log(`[SYNC-SCALABLEPRESS] Category ${category.name}: ${products.length} products processed`);
          
        } catch (err) {
          console.error(`[SYNC-SCALABLEPRESS] Error processing category ${category.categoryId}:`, err);
        }
      }

      console.log(`[SYNC-SCALABLEPRESS] Sync complete: ${totalSynced} synced, ${totalErrors} errors out of ${totalProducts} total`);
      
      await sendProgress("Sync completed!", { 
        done: true,
        success: true, 
        synced: totalSynced, 
        total: totalProducts,
        errors: totalErrors,
        vendor: "scalablepress"
      });
      
      await writer.close();
    } catch (error) {
      console.error("[SYNC-SCALABLEPRESS] Fatal error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      await sendProgress(`Fatal error: ${message}`, { error: true, done: true });
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
