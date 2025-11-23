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

    // Step 1: Fetch categories first
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
    console.log(`[SYNC-SCALABLEPRESS] Found ${Object.keys(categories).length} categories`);

    // Step 2: Fetch products for each category
    let allProducts: any[] = [];
    
    for (const [categoryKey, categoryData] of Object.entries(categories)) {
      console.log(`[SYNC-SCALABLEPRESS] Fetching products for category: ${categoryKey}`);
      
      try {
        const productsResponse = await fetch(`${apiUrl}/products`, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${btoa(":" + apiKey)}`,
            "Accept": "application/json",
          },
        });

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          
          // Filter products by category and add to allProducts
          if (Array.isArray(productsData)) {
            const categoryProducts = productsData.filter((p: any) => 
              p.categoryId === categoryKey || p.category === categoryKey
            );
            allProducts = allProducts.concat(
              categoryProducts.map((p: any) => ({
                ...p,
                categoryName: (categoryData as any).name || categoryKey
              }))
            );
          } else if (productsData[categoryKey]) {
            // If API returns products grouped by category
            const categoryProducts = Array.isArray(productsData[categoryKey]) 
              ? productsData[categoryKey] 
              : Object.values(productsData[categoryKey]);
            allProducts = allProducts.concat(
              categoryProducts.map((p: any) => ({
                ...p,
                categoryName: (categoryData as any).name || categoryKey
              }))
            );
          }
        }
      } catch (err) {
        console.error(`[SYNC-SCALABLEPRESS] Error fetching products for ${categoryKey}:`, err);
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

    // Step 3: Transform and upsert products to database
    let synced = 0;
    let errors = 0;

    for (const product of allProducts) {
      try {
        // Extract base price (use lowest variant price if available)
        let basePriceCents = 0;
        if (product.price) {
          basePriceCents = Math.round(product.price * 100);
        } else if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
          const prices = product.variants
            .map((v: any) => v.price)
            .filter((p: any) => p && !isNaN(p));
          if (prices.length > 0) {
            basePriceCents = Math.round(Math.min(...prices) * 100);
          }
        }

        // Build product data object
        const productData = {
          name: product.name || product.title || "Unnamed Product",
          base_cost_cents: basePriceCents,
          category: product.categoryName || product.category || "apparel",
          image_url: product.image || product.defaultImage || product.thumbnail || null,
          description: product.description || null,
          vendor: "scalablepress",
          vendor_id: String(product.productId || product.id || product.sku),
          vendor_product_id: String(product.productId || product.id || product.sku),
          is_active: true,
          pricing_data: {
            variants: product.variants || [],
            colors: product.colors || [],
            sizes: product.sizes || [],
            styles: product.styles || []
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
