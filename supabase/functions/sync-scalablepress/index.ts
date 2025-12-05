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
    // Parse request body for pagination parameters and admin auth
    let offset = 0;
    let limit = 500; // Process 500 products per run to avoid timeout
    let adminSessionToken = "";
    
    try {
      const body = await req.json();
      offset = body.offset || 0;
      limit = body.limit || 500;
      adminSessionToken = body.adminSessionToken || "";
    } catch {
      // Use defaults if no body
    }

    // ADMIN AUTH: Validate admin session token
    if (!adminSessionToken) {
      console.log("[SYNC-SCALABLEPRESS] Unauthorized: Missing admin session token");
      return new Response(
        JSON.stringify({ success: false, error: "Admin authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .select("*")
      .eq("token", adminSessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.log("[SYNC-SCALABLEPRESS] Unauthorized: Invalid or expired session");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired admin session" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[SYNC-SCALABLEPRESS] Admin session validated");
    console.log(`[SYNC-SCALABLEPRESS] Starting sync with offset=${offset}, limit=${limit}`);

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
           let baseCostCents = 0; // Default to 0 so products without prices get filtered out
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

          // Determine best image URL with multiple fallbacks:
          // 1. Main product image from category listing
          // 2. Main product image from product detail
          // 3. First color's first image from product detail
          let imageUrl = product.image?.url || productDetail?.image?.url || null;
          
          if (!imageUrl && colors.length > 0) {
            // Try to get image from first color with images
            for (const color of colors) {
              if (color.images && color.images.length > 0) {
                const firstImage = color.images[0];
                imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url || null;
                if (imageUrl) {
                  console.log(`[SYNC-SCALABLEPRESS] Product ${product.id}: using color image from "${color.name}"`);
                  break;
                }
              }
            }
          }

          // Determine is_active based on image availability
          // Products without images will be synced but marked inactive
          // Admins can later manually fix image_url and flip is_active = true
          const hasImage = !!imageUrl && imageUrl.trim() !== '';

          return {
            name: product.name || "Unnamed Product",
            category: product.category,
            image_url: imageUrl,
            description: productDetail?.description || null,
            vendor: "scalablepress",
            vendor_id: product.id,
            vendor_product_id: product.id,
            is_active: hasImage, // Auto-set based on image availability
            base_cost_cents: baseCostCents,
            pricing_data: pricingData,
          };
        } catch (error) {
          console.error(`[SYNC-SCALABLEPRESS] Error fetching config for ${product.id}:`, error);
          // Return basic product without config data - set price to 0 so it gets filtered out
          const fallbackImage = product.image?.url || null;
          const hasFallbackImage = !!fallbackImage && fallbackImage.trim() !== '';
          
          return {
            name: product.name || "Unnamed Product",
            category: product.category,
            image_url: fallbackImage,
            description: null,
            vendor: "scalablepress",
            vendor_id: product.id,
            vendor_product_id: product.id,
            is_active: hasFallbackImage, // Inactive if no image
            base_cost_cents: 0, // Will be filtered out
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

    console.log(`[SYNC-SCALABLEPRESS] Collected ${productsWithConfig.length} products with configuration`);

    // Step 4: Fetch existing products to preserve custom configurations
    const vendorIds = productsWithConfig.map(p => p.vendor_id);
    const { data: existingProducts, error: fetchError } = await supabase
      .from("products")
        .select("vendor_id, markup_fixed_cents, markup_percent, price_override_cents, image_url, generated_image_url, is_active")
        .eq("vendor", "scalablepress")
        .in("vendor_id", vendorIds);

    if (fetchError) {
      console.error("[SYNC-SCALABLEPRESS] Error fetching existing products:", fetchError);
    }

    // Create a map of existing product customizations to preserve
    const existingCustomizations = new Map<string, any>();
    if (existingProducts) {
      for (const product of existingProducts) {
        existingCustomizations.set(product.vendor_id, {
          markup_fixed_cents: product.markup_fixed_cents,
          markup_percent: product.markup_percent,
          price_override_cents: product.price_override_cents,
          image_url: product.image_url,
          generated_image_url: product.generated_image_url,
          is_active: product.is_active,
        });
      }
      console.log(`[SYNC-SCALABLEPRESS] Found ${existingCustomizations.size} existing products with potential customizations to preserve`);
    }

    // Merge new data with existing customizations and filter out products without valid prices
    const productsToUpsert = productsWithConfig
      .map(product => {
        const existing = existingCustomizations.get(product.vendor_id);
        if (existing) {
          // Preserve custom markups if they were set
          if (existing.markup_fixed_cents !== null) {
            product.markup_fixed_cents = existing.markup_fixed_cents;
          }
          if (existing.markup_percent !== null) {
            product.markup_percent = existing.markup_percent;
          }
          if (existing.price_override_cents !== null) {
            product.price_override_cents = existing.price_override_cents;
          }
          // Preserve custom/generated images - only use API image if no custom image exists
          if (existing.image_url && existing.image_url !== product.image_url) {
            // Keep existing custom image unless the new one is non-null and existing is null
            product.image_url = existing.image_url;
          }
          if (existing.generated_image_url) {
            product.generated_image_url = existing.generated_image_url;
          }
          
          // Recalculate is_active based on final image_url:
          // - Products without images are ALWAYS inactive (can't be manually enabled)
          // - Products with images preserve admin's is_active setting
          const finalHasImage = !!product.image_url && product.image_url.trim() !== '';
          if (!finalHasImage) {
            product.is_active = false; // Force inactive if no image
          } else if (existing.is_active !== undefined && existing.is_active !== null) {
            product.is_active = existing.is_active; // Preserve admin setting if has image
          }
          // Otherwise keep the new product's is_active (which is true if has image)
        }
        return product;
      })
      .filter(product => product.base_cost_cents >= 100); // Only include products with valid prices

    console.log(`[SYNC-SCALABLEPRESS] Filtered to ${productsToUpsert.length} products with valid prices (excluded ${productsWithConfig.length - productsToUpsert.length} without prices)`);
    console.log(`[SYNC-SCALABLEPRESS] Batch upserting ${productsToUpsert.length} products (with preserved customizations)...`);

    // Step 5: Batch upsert in chunks
    const upsertBatchSize = 100;
    let totalSynced = 0;
    let totalErrors = 0;

    for (let i = 0; i < productsToUpsert.length; i += upsertBatchSize) {
      const batch = productsToUpsert.slice(i, i + upsertBatchSize);
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
