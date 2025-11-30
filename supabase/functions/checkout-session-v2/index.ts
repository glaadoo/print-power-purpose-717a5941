import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { computeGlobalPricing, type PricingSettings } from "../_shared/pricing.ts";
import { calculateOrderShipping, getShippingTierLabel } from "../_shared/shipping-tiers.ts";

/**
 * CHECKOUT SESSION V2 - PRICING & TAX LOGIC
 * 
 * This edge function creates Stripe Checkout sessions with proper pricing and tax calculation.
 * 
 * KEY PRICING RULES:
 * - Product prices are computed using computeGlobalPricing() from _shared/pricing.ts
 * - Shipping is calculated per order using calculateOrderShipping() from _shared/shipping-tiers.ts
 * - Donations are optional and added as separate line items
 * 
 * STRIPE TAX INTEGRATION:
 * - automatic_tax: { enabled: true } enables Stripe Tax
 * - shipping_address_collection collects address for tax calculation
 * - After session creation, we retrieve the expanded session to get calculated tax
 * - Tax amount is stored in orders.tax_cents for record keeping
 * 
 * IMPORTANT: To change tax behavior or pricing rules:
 * 1. Tax rules are managed in Stripe Dashboard > Settings > Tax
 * 2. Product pricing logic is in ../shared/pricing.ts (computeGlobalPricing)
 * 3. Shipping tiers are defined in ../shared/shipping-tiers.ts
 * 4. Line items MUST use unit_amount in CENTS with quantity (never double-multiply)
 * 
 * DEBUGGING NOTES:
 * - All amounts are logged in console with [PPP:PRICING:CHECKOUT] and [PPP:STRIPE:TAX] prefixes
 * - Check line items payload sent to Stripe for unit_amount × quantity correctness
 * - Verify tax is calculated by checking expandedSession.total_details.amount_tax
 */

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

    // Fetch nonprofit details if nonprofitId is provided
    let nonprofitName = null;
    let nonprofitEin = null;
    if (nonprofitId) {
      const { data: nonprofit } = await supabase
        .from("nonprofits")
        .select("name, ein")
        .eq("id", nonprofitId)
        .single();
      
      if (nonprofit) {
        nonprofitName = nonprofit.name;
        nonprofitEin = nonprofit.ein;
      }
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
    const shippingItems: Array<{ productName: string; category?: string | null }> = [];
    
    // Track vendor for this order (assumes single-vendor orders)
    let orderVendorKey: string | null = null;
    let orderVendorName: string | null = null;

    for (const cartItem of cart.items) {
      // Fetch product with category
      const { data: product } = await supabase
        .from("products")
        .select("id, name, vendor, base_cost_cents, category")
        .eq("id", cartItem.id)
        .single();

      if (!product) {
        throw new Error(`Product not found: ${cartItem.id}`);
      }
      
      // Set order-level vendor from first item (assuming single-vendor orders)
      if (!orderVendorKey) {
        orderVendorKey = product.vendor;
        // Map vendor key to display name
        const vendorNames: Record<string, string> = {
          'sinalite': 'SinaLite',
          'scalablepress': 'Scalable Press',
          'psrestful': 'PSRestful',
        };
        orderVendorName = vendorNames[product.vendor] || product.vendor;
      }

      // Collect for shipping calculation
      shippingItems.push({ productName: product.name, category: product.category });

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
        category: product.category,
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
        category: product.category,
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

    // Calculate shipping based on product categories
    const shippingCents = calculateOrderShipping(shippingItems);
    const shippingLabel = getShippingTierLabel(shippingCents);
    console.log("[PPP:SHIPPING] Calculated shipping:", { shippingCents, shippingLabel, items: shippingItems });

    // Tax will be calculated by Stripe automatically
    const taxCents = 0; // Placeholder - Stripe Tax will compute this
    const donationAmount = donationCents || 0;
    // Note: totalAmountCents here is BEFORE Stripe Tax is applied
    const totalAmountCents = subtotalCents + shippingCents + taxCents + donationAmount;

    console.log("[PPP:PRICING:CHECKOUT] Order totals (before Stripe Tax):", {
      subtotalCents,
      shippingCents,
      taxCents: "will be calculated by Stripe",
      donationAmount,
      totalAmountCents: "before tax",
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

    // Create order record FIRST with vendor info
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
        nonprofit_name: nonprofitName,
        nonprofit_ein: nonprofitEin,
        payment_mode: stripeMode,
        vendor_key: orderVendorKey,
        vendor_name: orderVendorName,
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
    // CRITICAL: Each cart item becomes exactly ONE line_item entry
    // unit_amount is in CENTS, quantity handles multiples
    const lineItems = orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product_name,
        },
        unit_amount: item.final_price_per_unit_cents, // Per-unit price in CENTS
      },
      quantity: item.quantity, // Stripe multiplies unit_amount × quantity
    }));

    // Add shipping as a separate line item (added exactly once)
    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: shippingLabel,
          },
          unit_amount: shippingCents, // Total shipping in CENTS
        },
        quantity: 1,
      });
    }

    // Add donation if present (added exactly once)
    if (donationAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Donation to Nonprofit",
          },
          unit_amount: donationAmount, // Donation in CENTS
        },
        quantity: 1,
      });
    }

    // Log final line items for debugging
    console.log("[PPP:STRIPE] Line items sent to Stripe:", JSON.stringify(lineItems, null, 2));

    // Create Stripe Checkout Session
    const origin = req.headers.get("origin") || "http://localhost:8080";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      
      // 🔒 TEMPORARILY DISABLE STRIPE AUTOMATIC TAX
      // When going live, UNCOMMENT the automatic_tax block below.
      /*
      automatic_tax: {
        enabled: true, // ← turn ON at launch
      },
      */
      
      // ✅ CRITICAL: Keep shipping address collection ENABLED even with tax disabled
      // This collects customer email and shipping details required for order fulfillment
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        nonprofit_id: nonprofitId || "",
        nonprofit_name: nonprofitName || "",
        nonprofit_ein: nonprofitEin || "",
        donation_cents: String(donationAmount),
        shipping_cents: String(shippingCents),
      },
    });

    // 🔒 TAX RETRIEVAL TEMPORARILY DISABLED (since automatic_tax is off)
    // When going live, UNCOMMENT this block to retrieve calculated tax from Stripe.
    /*
    const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['total_details'],
    });

    const calculatedTaxCents = expandedSession.total_details?.amount_tax || 0;
    const finalTotalCents = expandedSession.amount_total || totalAmountCents;

    console.log("[PPP:STRIPE:TAX] Tax calculated by Stripe:", {
      subtotalCents,
      shippingCents,
      taxCents: calculatedTaxCents,
      donationAmount,
      finalTotal: finalTotalCents,
    });
    */

    // For now, no tax is applied
    const calculatedTaxCents = 0;
    const finalTotalCents = totalAmountCents; // subtotal + shipping + donation (no tax)

    // Update order with Stripe session ID (no tax)
    await supabase
      .from("orders")
      .update({ 
        session_id: session.id,
        tax_cents: calculatedTaxCents,
        amount_total_cents: finalTotalCents,
      })
      .eq("id", orderId);

    console.log("[PPP:PRICING:CHECKOUT] Stripe session created:", {
      sessionId: session.id,
      orderId,
      orderNumber,
      url: session.url,
      taxCents: calculatedTaxCents,
      finalTotal: finalTotalCents,
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        orderId,
        orderNumber,
        taxCents: calculatedTaxCents,
        totalCents: finalTotalCents,
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
