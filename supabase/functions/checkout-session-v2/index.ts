import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { computeGlobalPricing, type PricingSettings } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Stripe mode
    let stripeMode = "test";
    try {
      const { data: modeSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stripe_mode")
        .single();
      stripeMode = modeSetting?.value || "test";
    } catch (error) {
      console.warn("Could not fetch stripe_mode, defaulting to test:", error);
    }
    
    const stripeKeyEnv = stripeMode === "live" ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY_TEST";
    const stripeKey = Deno.env.get(stripeKeyEnv) || Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      throw new Error(`Missing Stripe secret key. Please configure ${stripeKeyEnv}`);
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const { cart, nonprofitId, donationCents } = await req.json();

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Load global SinaLite pricing settings
    console.log("[PPP:PRICING:CHECKOUT] Loading global pricing settings");
    const { data: pricingSettings, error: pricingError } = await supabase
      .from("pricing_settings")
      .select("*")
      .eq("vendor", "sinalite")
      .single();

    if (pricingError) {
      console.error("[PPP:PRICING:CHECKOUT] Failed to load pricing settings:", pricingError);
      throw new Error("Failed to load pricing configuration");
    }

    const settings = pricingSettings as PricingSettings;
    console.log("[PPP:PRICING:CHECKOUT] Loaded settings:", {
      markup_mode: settings.markup_mode,
      markup_fixed_cents: settings.markup_fixed_cents,
      markup_percent: settings.markup_percent,
      nonprofit_share_mode: settings.nonprofit_share_mode,
      nonprofit_fixed_cents: settings.nonprofit_fixed_cents,
      nonprofit_percent_of_markup: settings.nonprofit_percent_of_markup,
    });

    // Build order items with global pricing
    const orderItems = [];
    let subtotalCents = 0;

    for (const cartItem of cart.items) {
      // Fetch product
      const { data: product } = await supabase
        .from("products")
        .select("id, name, vendor, base_cost_cents")
        .eq("id", cartItem.id)
        .single();

      if (!product) {
        throw new Error(`Product not found: ${cartItem.id}`);
      }

      // Compute pricing using global engine
      const pricing = computeGlobalPricing({
        vendor: product.vendor,
        base_cost_cents: product.base_cost_cents,
        settings,
      });

      const lineSubtotal = pricing.final_price_per_unit_cents * cartItem.quantity;
      subtotalCents += lineSubtotal;

      console.log("[PPP:PRICING:CHECKOUT] Item", {
        productId: product.id,
        productName: product.name,
        vendor: product.vendor,
        quantity: cartItem.quantity,
        base_cost_cents: pricing.base_price_per_unit_cents,
        markup_amount_cents: pricing.markup_amount_cents,
        donation_per_unit_cents: pricing.donation_per_unit_cents,
        gross_margin_per_unit_cents: pricing.gross_margin_per_unit_cents,
        final_price_per_unit_cents: pricing.final_price_per_unit_cents,
        line_subtotal_cents: lineSubtotal,
      });

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        vendor: product.vendor,
        quantity: cartItem.quantity,
        base_price_per_unit_cents: pricing.base_price_per_unit_cents,
        markup_mode: settings.markup_mode,
        markup_fixed_cents: settings.markup_fixed_cents,
        markup_percent: settings.markup_percent,
        nonprofit_share_mode: settings.nonprofit_share_mode,
        nonprofit_fixed_cents: settings.nonprofit_fixed_cents,
        nonprofit_percent_of_markup: settings.nonprofit_percent_of_markup,
        donation_per_unit_cents: pricing.donation_per_unit_cents,
        gross_margin_per_unit_cents: pricing.gross_margin_per_unit_cents,
        final_price_per_unit_cents: pricing.final_price_per_unit_cents,
        line_subtotal_cents: lineSubtotal,
      });
    }

    const taxCents = 0;
    const donationAmount = donationCents || 0;
    const totalAmountCents = subtotalCents + taxCents + donationAmount;

    console.log("[PPP:PRICING:CHECKOUT] Order totals:", {
      subtotalCents,
      taxCents,
      donationAmount,
      totalAmountCents,
    });

    // Generate order number
    let orderNumber: string;
    try {
      const { data: orderNumberData, error: orderNumError } = await supabase
        .rpc("generate_order_number");
      
      if (orderNumError || !orderNumberData) {
        throw orderNumError || new Error("No order number returned");
      }
      
      orderNumber = orderNumberData as string;
    } catch (error) {
      console.warn("generate_order_number RPC failed, using fallback:", error);
      const year = new Date().getFullYear();
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      orderNumber = `PPP-${year}-${String(timestamp).slice(-6).padStart(6, '0')}`;
    }

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
      .select("id")
      .single();

    if (orderError || !orderData) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
    }

    const orderId = orderData.id;
    console.log("[PPP:PRICING:CHECKOUT] Created order:", {
      orderId,
      orderNumber,
      tempSessionId,
    });

    // Build Stripe line items using computed final prices
    const lineItems = orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product_name,
        },
        unit_amount: item.final_price_per_unit_cents, // USE COMPUTED FINAL PRICE
      },
      quantity: item.quantity,
    }));

    // Add donation if present
    if (donationAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Donation to Nonprofit",
          },
          unit_amount: donationAmount,
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    const origin = req.headers.get("origin") || "http://localhost:8080";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        nonprofit_id: nonprofitId || "",
        donation_cents: String(donationAmount),
      },
    });

    // Update order with Stripe session ID
    await supabase
      .from("orders")
      .update({ session_id: session.id })
      .eq("id", orderId);

    console.log("[PPP:PRICING:CHECKOUT] Stripe session created:", {
      sessionId: session.id,
      orderId,
      orderNumber,
      url: session.url,
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        orderId,
        orderNumber,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[PPP:PRICING:CHECKOUT] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create checkout session",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
