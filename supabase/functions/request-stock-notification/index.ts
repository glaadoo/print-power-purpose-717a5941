import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  email: string;
  productId: string;
  productName: string;
  color: string;
  size: string;
  vendor: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[REQUEST-STOCK-NOTIFICATION] Starting notification request");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const { email, productId, productName, color, size, vendor }: NotificationRequest = await req.json();

    // Validate input
    if (!email || !productId || !productName || !color || !size || !vendor) {
      console.error("[REQUEST-STOCK-NOTIFICATION] Missing required fields");
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          required: ["email", "productId", "productName", "color", "size", "vendor"]
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("[REQUEST-STOCK-NOTIFICATION] Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[REQUEST-STOCK-NOTIFICATION] Request details:", {
      email,
      productId,
      productName,
      color,
      size,
      vendor
    });

    // Insert notification request (UPSERT to handle duplicates)
    const { data, error } = await supabase
      .from("stock_notifications")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          product_id: productId,
          product_name: productName,
          color,
          size,
          vendor,
          notified: false,
        },
        {
          onConflict: "email,product_id,color,size",
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      console.error("[REQUEST-STOCK-NOTIFICATION] Database error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to save notification request",
          details: error.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[REQUEST-STOCK-NOTIFICATION] Notification request saved:", data.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "You'll be notified when this item is back in stock",
        notificationId: data.id
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error("[REQUEST-STOCK-NOTIFICATION] Fatal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        error: message,
        success: false
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
