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
    console.log("[SYNC-SCALABLEPRESS] Starting product sync");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const apiKey = Deno.env.get("SCALABLEPRESS_API_KEY");
    const apiUrl = "https://api.scalablepress.com/v2";

    if (!apiKey) {
      console.error("[SYNC-SCALABLEPRESS] Missing SCALABLEPRESS_API_KEY");
      return new Response(
        JSON.stringify({ 
          error: "Scalable Press API credentials not configured",
          note: "Please add SCALABLEPRESS_API_KEY secret in your backend settings"
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 1: Fetch categories
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
        JSON.stringify({
          success: false,
          synced: 0,
          total: 0,
          vendor: "scalablepress",
          error: `API returned ${categoriesResponse.status}`,
          details: errorText.slice(0, 300)
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const categories = await categoriesResponse.json();
    console.log(`[SYNC-SCALABLEPRESS] Found ${categories.length} categories`);

    // Step 2: Fetch products for each category
    let allProducts: any[] = [];
    
    for (const category of categories) {
      console.log(`[SYNC-SCALABLEPRESS] Fetching products for category: ${category.categoryId}`);
      
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

    console.log(`[SYNC-SCALABLEPRESS] Total products fetched: ${allProducts.length}`);

    if (allProducts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          total: 0,
          vendor: "scalablepress",
          note: "No products found. Check API access or product availability."
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 3: Fetch detailed product information and transform
    let synced = 0;
    let errors = 0;

    for (const product of allProducts) {
      try {
        console.log(`[SYNC-SCALABLEPRESS] Fetching details for: ${product.name}`);
        
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
        let lowestPrice = 0;
        
        if (itemsResponse.ok) {
          itemsData = await itemsResponse.json();
          
          // Extract lowest price from all color/size combinations
          const allPrices: number[] = [];
          for (const colorData of Object.values(itemsData)) {
            for (const sizeData of Object.values(colorData as any)) {
              if (typeof sizeData === 'object' && sizeData !== null && 'price' in sizeData) {
                allPrices.push((sizeData as any).price);
              }
            }
          }
          
          if (allPrices.length > 0) {
            lowestPrice = Math.min(...allPrices);
          }
        }

        // Extract colors and sizes for pricing_data
        const colors = productDetails.colors || [];
        const sizes = colors.length > 0 ? colors[0].sizes || [] : [];
        
        // CRITICAL: Extract image from multiple possible locations
        // Priority: detailed product images > color-specific images > category product image
        let firstColorImage = null;
        
        // Try detailed product response images first
        if (productDetails.images && Array.isArray(productDetails.images) && productDetails.images.length > 0) {
          firstColorImage = productDetails.images[0].url || productDetails.images[0];
        }
        // Try color-specific images next
        else if (colors.length > 0 && colors[0].images?.length > 0) {
          firstColorImage = colors[0].images[0].url || colors[0].images[0];
        }
        // Try product.image from category endpoint
        else if (product.image?.url) {
          firstColorImage = product.image.url;
        }
        // Try productDetails.image as fallback
        else if (productDetails.image?.url) {
          firstColorImage = productDetails.image.url;
        }
        
        console.log(`[SYNC-SCALABLEPRESS] Image extraction for ${product.id}:`, { 
          hasDetailImages: !!(productDetails.images?.length),
          hasColorImages: !!(colors[0]?.images?.length),
          hasCategoryImage: !!product.image?.url,
          extractedImage: firstColorImage
        });

        // Build product data object
        const productData = {
          name: productDetails.name || product.name || "Unnamed Product",
          base_cost_cents: lowestPrice, // Lowest price from items endpoint
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
            items: itemsData, // Store full pricing/availability data
            productUrl: product.url
          }
        };

        // Upsert to database (update if exists, insert if new)
        const { error } = await supabase
          .from("products")
          .upsert(productData, { 
            onConflict: "vendor,vendor_id",
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`[SYNC-SCALABLEPRESS] Error upserting product ${productData.vendor_id}:`, error);
          errors++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error("[SYNC-SCALABLEPRESS] Error processing product:", err);
        errors++;
      }
    }

    console.log(`[SYNC-SCALABLEPRESS] Sync complete: ${synced} synced, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        total: allProducts.length,
        errors,
        vendor: "scalablepress",
        message: `Successfully synced ${synced} out of ${allProducts.length} products`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[SYNC-SCALABLEPRESS] Fatal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        error: message,
        success: false,
        synced: 0
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
