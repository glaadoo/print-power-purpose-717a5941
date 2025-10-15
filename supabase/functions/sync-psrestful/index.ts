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
    console.log("[SYNC-PSRESTFUL] Starting product sync");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const apiKey = Deno.env.get("PSRESTFUL_API_KEY");
    const apiUrl = Deno.env.get("PSRESTFUL_API_URL") || "https://api.psrestful.com/v1";

    if (!apiKey) {
      console.error("[SYNC-PSRESTFUL] Missing PSRESTFUL_API_KEY");
      return new Response(
        JSON.stringify({ error: "PsRestful API credentials not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch products from PsRestful API
    console.log("[SYNC-PSRESTFUL] Fetching from PsRestful API");
    const response = await fetch(`${apiUrl}/products`, {
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`PsRestful API error: ${response.status}`);
    }

    const products = await response.json();
    console.log(`[SYNC-PSRESTFUL] Fetched ${products.length || 0} products`);

    // Transform and upsert products
    const productsToSync = (products.data || products || []).map((p: any) => ({
      name: p.name || p.productName,
      base_cost_cents: Math.round((p.price || p.wholesalePrice || 0) * 100),
      category: p.category || "promo",
      image_url: p.imageUrl || p.thumbnail || null,
      vendor: "psrestful",
      vendor_id: String(p.productId || p.id),
    }));

    let synced = 0;
    for (const product of productsToSync) {
      const { error } = await supabase
        .from("products")
        .upsert(
          product,
          { onConflict: "vendor,vendor_id" }
        );

      if (error) {
        console.error("[SYNC-PSRESTFUL] Error upserting product:", product.vendor_id, error);
      } else {
        synced++;
      }
    }

    console.log(`[SYNC-PSRESTFUL] Successfully synced ${synced}/${productsToSync.length} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        total: productsToSync.length,
        vendor: "psrestful"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[SYNC-PSRESTFUL] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
