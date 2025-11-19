import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pricing function - matches client-side pricing-utils.ts
function computeFinalPrice(
  base_price_cents: number,
  markup_fixed_cents: number | null,
  markup_percent: number | null
): number {
  const fixed = markup_fixed_cents ?? 0;
  const percent = markup_percent ?? 0;
  
  let price = base_price_cents;
  price += base_price_cents * (percent / 100);
  price += fixed;
  
  return Math.round(price);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Stripe mode (with fallback if app_settings doesn't exist)
    let stripeMode = "test";
    try {
      const { data: modeSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stripe_mode")
        .single();
      stripeMode = modeSetting?.value || "test";
    } catch (error) {
      console.warn("Could not fetch stripe_mode from app_settings, defaulting to test:", error);
      stripeMode = "test";
    }
    const stripeKeyEnv = stripeMode === "live" ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY_TEST";
    const stripeKey = Deno.env.get(stripeKeyEnv) || Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      console.error(`Missing Stripe key. Tried: ${stripeKeyEnv} and STRIPE_SECRET_KEY`);
      throw new Error(`Missing Stripe secret key. Please configure ${stripeKeyEnv} or STRIPE_SECRET_KEY in environment variables.`);
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const { cart, nonprofitId, donationCents } = await req.json();

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Build order items with pricing details
    const orderItems = [];
    let subtotalCents = 0;

    for (const cartItem of cart.items) {
      // Fetch product with markup info
      const { data: product } = await supabase
        .from("products")
        .select("id, name, base_cost_cents, markup_fixed_cents, markup_percent")
        .eq("id", cartItem.id)
        .single();

      if (!product) {
        throw new Error(`Product not found: ${cartItem.id}`);
      }

      // Use base_cost_cents as base price (SinaLite price)
      const basePriceCents = product.base_cost_cents;
      const markupFixedCents = product.markup_fixed_cents ?? 0;
      const markupPercent = product.markup_percent ?? 0;

      // Compute final unit price
      const finalUnitPriceCents = computeFinalPrice(
        basePriceCents,
        markupFixedCents,
        markupPercent
      );

      const lineSubtotal = finalUnitPriceCents * cartItem.quantity;
      subtotalCents += lineSubtotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: cartItem.quantity,
        base_price_per_unit: basePriceCents,
        markup_fixed_per_unit: markupFixedCents,
        markup_percent: markupPercent,
        final_price_per_unit: finalUnitPriceCents,
        line_subtotal: lineSubtotal,
      });
    }

    const taxCents = 0; // TODO: Implement tax calculation if needed
    const donationAmount = donationCents || 0;
    const totalAmountCents = subtotalCents + taxCents + donationAmount;

    // Generate clean order number using database function (with fallback)
    let orderNumber: string;
    try {
      const { data: orderNumberData, error: orderNumError } = await supabase
        .rpc("generate_order_number");
      
      if (orderNumError || !orderNumberData) {
        throw orderNumError || new Error("No order number returned");
      }
      
      orderNumber = orderNumberData as string;
    } catch (error) {
      // Fallback: Generate simple order number if RPC function doesn't exist
      console.warn("generate_order_number RPC failed, using fallback:", error);
      const year = new Date().getFullYear();
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      orderNumber = `ORD-${year}-${timestamp}-${random}`;
    }

<<<<<<< HEAD
    // Create order record FIRST - try new schema first, fallback to old schema
    let orderData: any;
    let orderError: any;
    
    // Try new schema (with all new fields)
    const newSchemaOrder = {
      order_number: orderNumber,
      status: "created",
      items: orderItems,
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      donation_cents: donationAmount,
      amount_total_cents: totalAmountCents,
      currency: "usd",
      nonprofit_id: nonprofitId,
      payment_mode: stripeMode,
    };
    
    console.log("Attempting to insert order with new schema:", {
      hasOrderNumber: !!newSchemaOrder.order_number,
      itemsCount: newSchemaOrder.items?.length,
      subtotalCents: newSchemaOrder.subtotal_cents,
      totalCents: newSchemaOrder.amount_total_cents
    });
    
    const result = await supabase
      .from("orders")
      .insert(newSchemaOrder as any)
=======
    const orderNumber = orderNumberData as string;

    // Generate temporary session ID (will be replaced with Stripe session ID)
    const tempSessionId = crypto.randomUUID();

    // Create order record FIRST
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        session_id: tempSessionId,
        status: "created",
        items: orderItems,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        donation_cents: donationAmount,
        amount_total_cents: totalAmountCents,
        currency: "usd",
        nonprofit_id: nonprofitId,
        payment_mode: stripeMode,
      })
>>>>>>> 3f6e690a97dc2a7fa30609dc72e9d2a676d94a61
      .select("id")
      .single();
    
    orderData = result.data;
    orderError = result.error;
    
    if (orderError) {
      console.log("New schema insert error details:", {
        code: orderError.code,
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint
      });
    } else {
      console.log("New schema insert succeeded, order ID:", orderData?.id);
    }
    
    // If new schema fails, try old schema (backward compatibility)
    if (orderError) {
      console.warn("New schema insert failed, trying old schema:", orderError);
      
      // Try with old schema fields only
      const oldSchemaOrder: any = {
        status: "created",
        amount_cents: totalAmountCents,
      };
      
      // Add optional fields if they exist in schema
      if (nonprofitId) {
        oldSchemaOrder.cause_id = nonprofitId;
      }
      
      // Try to add first product if available
      if (orderItems.length > 0) {
        oldSchemaOrder.product_id = orderItems[0].product_id;
        oldSchemaOrder.qty = orderItems[0].quantity;
      }
      
      console.log("Attempting to insert order with old schema:", oldSchemaOrder);
      
      const oldResult = await supabase
        .from("orders")
        .insert(oldSchemaOrder)
        .select("id")
        .single();
      
      console.log("Old schema insert result:", {
        success: !oldResult.error,
        orderId: oldResult.data?.id,
        error: oldResult.error ? {
          code: oldResult.error.code,
          message: oldResult.error.message,
          details: oldResult.error.details
        } : null
      });
      
      if (!oldResult.error && oldResult.data) {
        // Success with old schema - update with order_number if column exists
        orderData = oldResult.data;
        orderError = null;
        
        // Try to update with order_number (might fail if column doesn't exist, that's ok)
        try {
          await supabase
            .from("orders")
            .update({ order_number: orderNumber })
            .eq("id", orderData.id);
        } catch (e) {
          console.warn("Could not update order_number (column may not exist):", e);
        }
      } else {
        // Both schemas failed
        orderError = oldResult.error || orderError;
      }
    }

    if (orderError || !orderData) {
      // Log detailed error information
      console.error("Error creating order - DETAILED:", {
        error: orderError,
        errorCode: orderError?.code,
        errorMessage: orderError?.message,
        errorDetails: orderError?.details,
        errorHint: orderError?.hint,
        orderData,
        attemptedNewSchema: newSchemaOrder,
        stripeKeyExists: !!stripeKey,
        stripeKeyPrefix: stripeKey?.substring(0, 7),
        supabaseUrl: supabaseUrl,
        hasServiceRoleKey: !!supabaseKey
      });
      
      // Provide more specific error message
      let errorMsg = "Failed to create order";
      if (orderError?.code === "42501") {
        errorMsg = "Permission denied. Check RLS policies allow service role to insert orders.";
      } else if (orderError?.code === "42P01") {
        errorMsg = "Table 'orders' does not exist. Check database migrations.";
      } else if (orderError?.code === "42703") {
        errorMsg = `Column does not exist: ${orderError?.message}. Check database schema.`;
      } else if (orderError?.message) {
        errorMsg = `Failed to create order: ${orderError.message}`;
        if (orderError.details) {
          errorMsg += ` (Details: ${orderError.details})`;
        }
        if (orderError.hint) {
          errorMsg += ` (Hint: ${orderError.hint})`;
        }
      }
      
      throw new Error(errorMsg);
    }

    const orderId = orderData.id;

    // Build Stripe line items from computed pricing
    const lineItems = orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        unit_amount: item.final_price_per_unit,
        product_data: {
          name: item.product_name,
        },
      },
      quantity: item.quantity,
    }));

    // Add donation as line item if present
    if (donationAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: donationAmount,
          product_data: {
            name: "Donation",
          },
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    const origin = req.headers.get("origin") || "https://wgohndthjgeqamfuldov.supabase.co";
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/success?orderId=${orderId}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        nonprofit_id: nonprofitId || "",
      },
    });

    // Update order with Stripe session ID
    await supabase
      .from("orders")
      .update({ session_id: session.id })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ url: session.url, orderId, orderNumber }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    // Log comprehensive error information
    console.error("Checkout error - FULL DETAILS:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    
    // Provide more helpful error messages
    let errorMessage = error.message || "An unknown error occurred";
    
    // Check for common issues and provide actionable messages
    if (error.message?.includes("Missing Stripe")) {
      errorMessage = "Stripe API key not configured. Please add STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST to environment variables in Lovable Cloud.";
    } else if (error.message?.includes("generate order number")) {
      errorMessage = "Database function 'generate_order_number' is missing. Please run database migrations.";
    } else if (error.message?.includes("Permission denied") || error.code === "42501") {
      errorMessage = "Permission denied. The service role cannot insert orders. Check RLS policies in your database.";
    } else if (error.message?.includes("Column does not exist") || error.code === "42703") {
      errorMessage = `Database schema mismatch: ${error.message}. Please run database migrations to add missing columns.`;
    } else if (error.message?.includes("Failed to create order")) {
      // Keep the detailed error message from the order creation
      errorMessage = error.message;
    }
    
    // Include detailed error info for debugging
    const errorResponse: any = { error: errorMessage };
    
    // Add debugging info if available
    if (error.code) {
      errorResponse.errorCode = error.code;
    }
    if (error.details) {
      errorResponse.details = error.details;
    }
    if (error.hint) {
      errorResponse.hint = error.hint;
    }
    
    // In development, include full error message
    if (error.message && error.message !== errorMessage) {
      errorResponse.originalMessage = error.message;
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
