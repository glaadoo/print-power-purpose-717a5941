import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Batch delay to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SYNC-SCALABLEPRESS] Starting comprehensive product sync with configuration data");

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

    // Step 1: Fetch all categories
    console.log("[SYNC-SCALABLEPRESS] Fetching categories");
    const categoriesResponse = await fetch(`${apiUrl}/categories`, {
      headers: {
        "Authorization": `Basic ${btoa(apiKey + ":")}`,
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

    // Step 2: Fetch all category products in PARALLEL
    const categoryFetches = categories.map(async (category: any) => {
      try {
        const response = await fetch(`${apiUrl}/categories/${category.categoryId}`, {
          headers: {
            "Authorization": `Basic ${btoa(apiKey + ":")}`,
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
    
    // Collect all unique products
    const productMap = new Map<string, any>();
    for (const { category, products } of categoryResults) {
      for (const product of products) {
        if (!productMap.has(product.id)) {
          productMap.set(product.id, {
            ...product,
            category: category.name || "apparel",
            categoryId: category.categoryId,
            categoryType: category.type,
          });
        }
      }
    }

    const allProducts = Array.from(productMap.values());
    console.log(`[SYNC-SCALABLEPRESS] Found ${allProducts.length} unique products, now fetching configuration data...`);

    // Step 3: Fetch detailed product data (colors, sizes, availability, items) for each product
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    const productsWithConfig: any[] = [];
    let fetchedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(batch.map(async (product: any) => {
        try {
          // Fetch product details (colors, sizes, images)
          const [productDetailRes, availabilityRes, itemsRes] = await Promise.all([
            fetch(`${apiUrl}/products/${product.id}`, {
              headers: {
                "Authorization": `Basic ${btoa(apiKey + ":")}`,
                "Accept": "application/json",
              },
            }),
            fetch(`${apiUrl}/products/${product.id}/availability`, {
              headers: {
                "Authorization": `Basic ${btoa(apiKey + ":")}`,
                "Accept": "application/json",
              },
            }),
            fetch(`${apiUrl}/products/${product.id}/items`, {
              headers: {
                "Authorization": `Basic ${btoa(apiKey + ":")}`,
                "Accept": "application/json",
              },
            }),
          ]);

          let productDetail: any = null;
          let availability: any = {};
          let items: any = {};

          // Parse product details
          if (productDetailRes.ok) {
            productDetail = await productDetailRes.json();
          } else {
            console.log(`[SYNC-SCALABLEPRESS] Failed to fetch details for ${product.id}:`, productDetailRes.status);
          }

          // Parse availability
          if (availabilityRes.ok) {
            availability = await availabilityRes.json();
          }

          // Parse items (pricing by color/size)
          if (itemsRes.ok) {
            items = await itemsRes.json();
          }

          // Extract colors with images from product detail
          const colors: any[] = [];
          if (productDetail?.colors && Array.isArray(productDetail.colors)) {
            for (const color of productDetail.colors) {
              colors.push({
                name: color.name,
                hex: color.hex || null,
                images: color.images || [],
                sizes: color.sizes || [],
              });
            }
          }

          // Calculate base cost from items (use minimum price)
          let baseCostCents = 1000; // Default fallback
          if (items && typeof items === 'object') {
            const allPrices: number[] = [];
            Object.values(items).forEach((colorData: any) => {
              if (typeof colorData === 'object') {
                Object.values(colorData).forEach((sizeData: any) => {
                  if (sizeData && typeof sizeData.price === 'number') {
                    // Scalable Press returns prices in cents
                    allPrices.push(sizeData.price);
                  }
                });
              }
            });
            if (allPrices.length > 0) {
              baseCostCents = Math.min(...allPrices);
            }
          }

          // Construct pricing_data with full configuration
          const pricingData = {
            style: product.style,
            categoryId: product.categoryId,
            categoryType: product.categoryType,
            productUrl: product.url,
            brand: productDetail?.brand || null,
            material: productDetail?.material || null,
            description: productDetail?.description || null,
            colors,
            items,
            availability,
          };

          return {
            name: product.name || "Unnamed Product",
            category: product.category,
            image_url: product.image?.url || productDetail?.image?.url || null,
            description: productDetail?.description || null,
            vendor: "scalablepress",
            vendor_id: product.id,
            vendor_product_id: product.id,
            is_active: true,
            base_cost_cents: baseCostCents,
            pricing_data: pricingData,
          };
        } catch (error) {
          console.error(`[SYNC-SCALABLEPRESS] Error fetching config for ${product.id}:`, error);
          // Return basic product without config data
          return {
            name: product.name || "Unnamed Product",
            category: product.category,
            image_url: product.image?.url || null,
            description: null,
            vendor: "scalablepress",
            vendor_id: product.id,
            vendor_product_id: product.id,
            is_active: true,
            base_cost_cents: 1000,
            pricing_data: {
              style: product.style,
              categoryId: product.categoryId,
              categoryType: product.categoryType,
              productUrl: product.url,
              colors: [],
              items: {},
              availability: {},
            },
          };
        }
      }));

      productsWithConfig.push(...batchResults);
      fetchedCount += batch.length;
      
      console.log(`[SYNC-SCALABLEPRESS] Processed ${fetchedCount}/${allProducts.length} products`);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < allProducts.length) {
        await delay(200);
      }
    }

    console.log(`[SYNC-SCALABLEPRESS] Collected ${productsWithConfig.length} products with configuration, batch upserting...`);

    // Step 4: Batch upsert in chunks
    const upsertBatchSize = 100;
    let totalSynced = 0;
    let totalErrors = 0;

    for (let i = 0; i < productsWithConfig.length; i += upsertBatchSize) {
      const batch = productsWithConfig.slice(i, i + upsertBatchSize);
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
        total: productsWithConfig.length,
        errors: totalErrors,
        message: `Synced ${totalSynced} products with full configuration data (colors, sizes, availability, pricing).`
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
