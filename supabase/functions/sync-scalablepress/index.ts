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
      console.log("[SYNC-SCALABLEPRESS] Starting product sync with streaming");
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

      // Step 2: Fetch products for each category
      let allProducts: any[] = [];
      
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        await sendProgress(`Fetching category ${i + 1}/${categories.length}: ${category.name}`);
        
        try {
          const productsResponse = await fetch(`${apiUrl}/categories/${category.categoryId}`, {
            headers: {
              "Authorization": `Basic ${btoa(":" + apiKey)}`,
              "Accept": "application/json",
            },
          });

          if (productsResponse.ok) {
            const categoryData = await productsResponse.json();
            
            if (categoryData.products && Array.isArray(categoryData.products)) {
              allProducts = allProducts.concat(
                categoryData.products.map((p: any) => ({
                  ...p,
                  categoryName: category.name,
                  categoryId: category.categoryId
                }))
              );
            }
          }
        } catch (err) {
          console.error(`[SYNC-SCALABLEPRESS] Error fetching products for ${category.categoryId}:`, err);
        }
      }

      await sendProgress(`Total products found: ${allProducts.length}`, { totalProducts: allProducts.length });
      console.log(`[SYNC-SCALABLEPRESS] Total products fetched: ${allProducts.length}`);

      if (allProducts.length === 0) {
        await sendProgress("No products found", { done: true, synced: 0, total: 0 });
        await writer.close();
        return;
      }

      // Step 3: Process products in batches with progress updates
      let synced = 0;
      let errors = 0;
      const batchSize = 10;

      for (let i = 0; i < allProducts.length; i += batchSize) {
        const batch = allProducts.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(allProducts.length / batchSize);
        
        await sendProgress(`Processing batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, allProducts.length)} of ${allProducts.length})`, {
          progress: Math.round((i / allProducts.length) * 100),
          synced,
          errors
        });

        // Process batch concurrently
        const batchPromises = batch.map(async (product) => {
          try {
            // Fetch detailed product information
            const detailsResponse = await fetch(`${apiUrl}/products/${product.id}`, {
              headers: {
                "Authorization": `Basic ${btoa(":" + apiKey)}`,
                "Accept": "application/json",
              },
            });

            let productDetails = product;
            if (detailsResponse.ok) {
              productDetails = await detailsResponse.json();
            }

            // Fetch item pricing information
            const itemsResponse = await fetch(`${apiUrl}/products/${product.id}/items`, {
              headers: {
                "Authorization": `Basic ${btoa(":" + apiKey)}`,
                "Accept": "application/json",
              },
            });

            let itemsData = null;
            let lowestPrice = 100; // Default to $1.00 (100 cents) minimum
            
            if (itemsResponse.ok) {
              itemsData = await itemsResponse.json();
              
              // Extract lowest price from all color/size combinations
              const allPrices: number[] = [];
              for (const colorData of Object.values(itemsData)) {
                for (const sizeData of Object.values(colorData as any)) {
                  if (typeof sizeData === 'object' && sizeData !== null && 'price' in sizeData) {
                    const price = (sizeData as any).price;
                    if (price > 0) {
                      allPrices.push(price);
                    }
                  }
                }
              }
              
              if (allPrices.length > 0) {
                lowestPrice = Math.max(Math.min(...allPrices), 100);
              }
            }

            // Fetch availability information
            const availabilityResponse = await fetch(`${apiUrl}/products/${product.id}/availability`, {
              headers: {
                "Authorization": `Basic ${btoa(":" + apiKey)}`,
                "Accept": "application/json",
              },
            });

            let availabilityData = null;
            if (availabilityResponse.ok) {
              availabilityData = await availabilityResponse.json();
            }

            // Extract colors and sizes for pricing_data
            const colors = productDetails.colors || [];
            const sizes = colors.length > 0 ? colors[0].sizes || [] : [];
            
            // Extract image from multiple possible locations
            let firstColorImage = null;
            
            if (productDetails.images && Array.isArray(productDetails.images) && productDetails.images.length > 0) {
              firstColorImage = productDetails.images[0].url || productDetails.images[0];
            } else if (colors.length > 0 && colors[0].images?.length > 0) {
              firstColorImage = colors[0].images[0].url || colors[0].images[0];
            } else if (product.image?.url) {
              firstColorImage = product.image.url;
            } else if (productDetails.image?.url) {
              firstColorImage = productDetails.image.url;
            }

            // Build product data object
            const productData = {
              name: productDetails.name || product.name || "Unnamed Product",
              base_cost_cents: lowestPrice,
              category: product.categoryName || "apparel",
              image_url: firstColorImage,
              description: productDetails.description || productDetails.comments || null,
              vendor: "scalablepress",
              vendor_id: product.id,
              vendor_product_id: product.id,
              is_active: productDetails.available !== false,
              pricing_data: {
                style: productDetails.properties?.style || product.style,
                brand: productDetails.properties?.brand,
                material: productDetails.properties?.material,
                colors: colors.map((c: any) => ({
                  name: c.name,
                  hex: c.hex,
                  sizes: c.sizes,
                  images: c.images
                })),
                sizes: sizes,
                items: itemsData,
                availability: availabilityData,
                productUrl: product.url
              }
            };

            // Upsert to database
            const { error } = await supabase
              .from("products")
              .upsert(productData, { 
                onConflict: "vendor,vendor_id",
                ignoreDuplicates: false 
              });

            if (error) {
              console.error(`[SYNC-SCALABLEPRESS] Error upserting product ${productData.vendor_id}:`, error);
              return { success: false };
            }
            return { success: true };
          } catch (err) {
            console.error("[SYNC-SCALABLEPRESS] Error processing product:", err);
            return { success: false };
          }
        });

        const results = await Promise.all(batchPromises);
        synced += results.filter(r => r.success).length;
        errors += results.filter(r => !r.success).length;
      }

      console.log(`[SYNC-SCALABLEPRESS] Sync complete: ${synced} synced, ${errors} errors`);
      
      await sendProgress("Sync completed!", { 
        done: true,
        success: true, 
        synced, 
        total: allProducts.length,
        errors,
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
