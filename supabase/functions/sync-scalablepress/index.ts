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
        JSON.stringify({ error: "Scalable Press API credentials not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch products from Scalable Press API
    console.log("[SYNC-SCALABLEPRESS] Fetching from Scalable Press API");
    const response = await fetch(`${apiUrl}/products`, {
      headers: {
        "Authorization": `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[SYNC-SCALABLEPRESS] API returned ${response.status}`);
      const textBody = await response.text();
      return new Response(
        JSON.stringify({
          success: false,
          synced: 0,
          total: 0,
          vendor: "scalablepress",
          note: `Scalable Press API returned ${response.status}. Check API credentials.`,
          preview: textBody.slice(0, 200)
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    let products: any = [];
    if (contentType.includes("application/json")) {
      products = await response.json();
    } else {
      const textBody = await response.text();
      console.warn("[SYNC-SCALABLEPRESS] Non-JSON response:", textBody.slice(0, 200));
      return new Response(
        JSON.stringify({
          success: false,
          synced: 0,
          total: 0,
          vendor: "scalablepress",
          note: "Scalable Press endpoint returned non-JSON. Configure API access to enable sync.",
          preview: textBody.slice(0, 200)
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[SYNC-SCALABLEPRESS] Fetched ${(products?.data?.length ?? products?.length ?? 0)} products`);

    // Transform and upsert products
    const productsToSync = (products || []).map((p: any) => ({
      name: p.name || p.title,
      base_cost_cents: Math.round((p.price || p.cost || 0) * 100),
      category: p.category || "apparel",
      image_url: p.image || p.defaultImage || null,
      vendor: "scalablepress",
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
        console.error("[SYNC-SCALABLEPRESS] Error upserting product:", product.vendor_id, error);
      } else {
        synced++;
      }
    }

    console.log(`[SYNC-SCALABLEPRESS] Successfully synced ${synced}/${productsToSync.length} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        total: productsToSync.length,
        vendor: "scalablepress"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("[SYNC-SCALABLEPRESS] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
