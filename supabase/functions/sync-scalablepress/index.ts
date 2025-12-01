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
    // Parse request body for pagination parameters
    let offset = 0;
    let limit = 500; // Process 500 products per run to avoid timeout
    
    try {
      const body = await req.json();
      offset = body.offset || 0;
      limit = body.limit || 500;
    } catch {
      // Use defaults if no body
    }

    console.log(`[SYNC-SCALABLEPRESS] Starting sync with offset=${offset}, limit=${limit}`);

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

    // Correct auth format for Scalable Press: `:apiKey` (colon before key)
    const authHeader = `Basic ${btoa(":" + apiKey)}`;
    
    // Step 1: Fetch all categories
    console.log("[SYNC-SCALABLEPRESS] Fetching categories");
    const categoriesResponse = await fetch(`${apiUrl}/categories`, {
      headers: {
        "Authorization": authHeader,
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
            "Authorization": authHeader,
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
    const totalProducts = allProducts.length;
    console.log(`[SYNC-SCALABLEPRESS] Found ${totalProducts} unique products total`);

    // Apply pagination - only process a slice of products
    const productsToProcess = allProducts.slice(offset, offset + limit);
    console.log(`[SYNC-SCALABLEPRESS] Processing products ${offset} to ${offset + productsToProcess.length} (of ${totalProducts})`);

    if (productsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          synced: 0, 
          total: totalProducts,
          offset,
          limit,
          hasMore: false,
          message: "No more products to sync"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Fetch detailed product data for the batch
    const batchSize = 10; // Process 10 products at a time
    const productsWithConfig: any[] = [];
    let fetchedCount = 0;

    for (let i = 0; i < productsToProcess.length; i += batchSize) {
      const batch = productsToProcess.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(batch.map(async (product: any) => {
        try {
          // Fetch product details (colors, sizes, images)
          const [productDetailRes, availabilityRes, itemsRes] = await Promise.all([
            fetch(`${apiUrl}/products/${product.id}`, {
              headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
              },
            }),
            fetch(`${apiUrl}/products/${product.id}/availability`, {
              headers: {
                "Authorization": authHeader,
                "Accept": "application/json",
              },
            }),
            fetch(`${apiUrl}/products/${product.id}/items`, {
              headers: {
                "Authorization": authHeader,
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
          }

          // Parse availability
          if (availabilityRes.ok) {
            availability = await availabilityRes.json();
          }

          // Parse items (pricing by color/size)
          if (itemsRes.ok) {
            items = await itemsRes.json();
          } else {
            console.log(`[SYNC-SCALABLEPRESS] Product ${product.id}: items endpoint returned ${itemsRes.status}`);
          }

          // Extract colors with images from product detail
          let colors: any[] = [];
          if (productDetail?.colors && Array.isArray(productDetail.colors) && productDetail.colors.length > 0) {
            for (const color of productDetail.colors) {
              colors.push({
                name: color.name,
                hex: color.hex || null,
                images: color.images || [],
                sizes: color.sizes || [],
              });
            }
          }
          
          // If colors array is empty but items has data, derive colors from items keys
          if (colors.length === 0 && items && typeof items === 'object' && Object.keys(items).length > 0) {
            const itemColorKeys = Object.keys(items);
            colors = itemColorKeys.map(colorKey => {
              // Capitalize color name parts (e.g., "black/stone" -> "Black/Stone")
              const formattedName = colorKey.split('/').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1)
              ).join('/');
              
              // Get available sizes for this color
              const sizesData = items[colorKey];
              const sizes = sizesData && typeof sizesData === 'object' ? Object.keys(sizesData) : [];
              
              return {
                name: formattedName,
                hex: null,
                images: [],
                sizes,
              };
            });
            console.log(`[SYNC-SCALABLEPRESS] Product ${product.id}: derived ${colors.length} colors from items keys`);
          }

          // Calculate base cost from items (use minimum price)
          let baseCostCents = 1000; // Default fallback
          if (items && typeof items === 'object' && Object.keys(items).length > 0) {
            const allPrices: number[] = [];
            Object.values(items).forEach((colorData: any) => {
              if (typeof colorData === 'object' && colorData !== null) {
                Object.values(colorData).forEach((sizeData: any) => {
                  if (sizeData && typeof sizeData === 'object' && 'price' in sizeData) {
                    const price = sizeData.price;
                    if (typeof price === 'number' && price > 0) {
                      // If price looks like dollars (< 100), convert to cents; otherwise use as-is
                      const priceInCents = price < 100 ? Math.round(price * 100) : Math.round(price);
                      allPrices.push(priceInCents);
                    }
                  }
                });
              }
            });
            if (allPrices.length > 0) {
              baseCostCents = Math.min(...allPrices);
              console.log(`[SYNC-SCALABLEPRESS] Product ${product.id}: found ${allPrices.length} prices, min=$${(baseCostCents/100).toFixed(2)}`);
            } else {
              console.log(`[SYNC-SCALABLEPRESS] Product ${product.id}: no valid prices in items data`);
            }
          } else {
            console.log(`[SYNC-SCALABLEPRESS] Product ${product.id}: items endpoint returned empty or invalid data`);
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
      
      console.log(`[SYNC-SCALABLEPRESS] Processed ${fetchedCount}/${productsToProcess.length} products in this batch`);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < productsToProcess.length) {
        await delay(100);
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

    const nextOffset = offset + productsToProcess.length;
    const hasMore = nextOffset < totalProducts;

    console.log(`[SYNC-SCALABLEPRESS] Batch complete: ${totalSynced} synced, ${totalErrors} errors, hasMore: ${hasMore}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: totalSynced, 
        total: totalProducts,
        offset,
        nextOffset: hasMore ? nextOffset : null,
        hasMore,
        errors: totalErrors,
        message: hasMore 
          ? `Synced ${totalSynced} products (${offset}-${nextOffset} of ${totalProducts}). Run again to continue.`
          : `Sync complete! ${totalSynced} products synced.`
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
