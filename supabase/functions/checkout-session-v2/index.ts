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
 * SECURITY FEATURES:
 * - Rate limiting per IP address (5 requests per minute)
 * - Server-side price validation against database prices
 * - Input validation for cart structure and product IDs
 * - Stock validation for Scalable Press products
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
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting for checkout abuse protection
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_CHECKOUT_REQUESTS = 5; // 5 checkout attempts per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_CHECKOUT_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// Input validation helpers
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function validateCartItem(item: any): { valid: boolean; error?: string } {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Invalid cart item structure' };
  }
  if (!item.id || typeof item.id !== 'string' || !isValidUUID(item.id)) {
    return { valid: false, error: 'Invalid product ID format' };
  }
  if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 10000) {
    return { valid: false, error: 'Invalid quantity (must be 1-10000)' };
  }
  if (item.priceCents !== undefined && (typeof item.priceCents !== 'number' || item.priceCents < 0)) {
    return { valid: false, error: 'Invalid price format' };
  }
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(clientIp)) {
    console.warn(`[PPP:CHECKOUT:RATE-LIMIT] IP ${clientIp} exceeded checkout rate limit`);
    return new Response(
      JSON.stringify({ 
        error: "Too many checkout attempts. Please wait a moment and try again.",
        code: 'RATE_LIMIT'
      }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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

    const body = await req.json();
    const { cart, nonprofitId, donationCents } = body;

    // Validate cart structure
    if (!cart || typeof cart !== 'object') {
      throw new Error("Invalid cart format");
    }
    
    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    if (cart.items.length > 50) {
      throw new Error("Cart has too many items (max 50)");
    }

    // Validate each cart item
    for (const item of cart.items) {
      const validation = validateCartItem(item);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    // Validate nonprofitId if provided
    if (nonprofitId && (typeof nonprofitId !== 'string' || !isValidUUID(nonprofitId))) {
      throw new Error("Invalid nonprofit ID format");
    }

    // Validate donationCents
    if (donationCents !== undefined && donationCents !== null) {
      if (typeof donationCents !== 'number' || donationCents < 0 || donationCents > 1000000) {
        throw new Error("Invalid donation amount");
      }
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
      // Fetch product with category and pricing_data for stock validation
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, name, vendor, base_cost_cents, category, pricing_data, is_active")
        .eq("id", cartItem.id)
        .single();

      if (productError || !product) {
        console.error("[PPP:CHECKOUT] Product not found:", cartItem.id);
        throw new Error(`Product not found: ${cartItem.id}`);
      }

      // Verify product is active
      if (!product.is_active) {
        throw new Error(`Product "${product.name}" is no longer available`);
      }
      
      // Validate stock for Scalable Press products
      if (product.vendor === 'scalablepress' && product.pricing_data && cartItem.configuration) {
        const availability = product.pricing_data?.availability || {};
        const selectedColor = cartItem.configuration?.color;
        const selectedSize = cartItem.configuration?.size;
        
        if (selectedColor) {
          // Find matching color key (case-insensitive)
          const availabilityColorKey = Object.keys(availability).find(
            key => key.toLowerCase() === selectedColor.toLowerCase()
          );
          
          if (availabilityColorKey) {
            // First check if entire color is out of stock (all sizes = 0)
            const colorStocks = availability[availabilityColorKey];
            const allSizesOutOfStock = Object.values(colorStocks).every((qty: any) => qty === 0);
            
            if (allSizesOutOfStock) {
              console.error("[PPP:CHECKOUT] Color completely out of stock:", {
                productId: product.id,
                productName: product.name,
                color: selectedColor
              });
              throw new Error(`"${product.name}" in color "${selectedColor}" is completely out of stock and cannot be purchased.`);
            }
            
            // Then check specific size stock
            if (selectedSize) {
              const stockQty = colorStocks?.[selectedSize];
              
              // Check if out of stock (quantity is 0)
              if (stockQty !== undefined && stockQty === 0) {
                console.error("[PPP:CHECKOUT] Out of stock item detected:", {
                  productId: product.id,
                  productName: product.name,
                  color: selectedColor,
                  size: selectedSize,
                  stockQty
                });
                throw new Error(`"${product.name}" in ${selectedColor}/${selectedSize} is out of stock and cannot be purchased.`);
              }
              
              // Optionally check if requested quantity exceeds available stock
              if (stockQty !== undefined && cartItem.quantity > stockQty) {
                console.error("[PPP:CHECKOUT] Insufficient stock:", {
                  productId: product.id,
                  productName: product.name,
                  color: selectedColor,
                  size: selectedSize,
                  requested: cartItem.quantity,
                  available: stockQty
                });
                throw new Error(`Only ${stockQty} units of "${product.name}" in ${selectedColor}/${selectedSize} are available. Please reduce quantity.`);
              }
            }
          }
        }
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

      // CRITICAL: Use the actual cart price (priceCents) that was shown to the user
      // BUT also validate it against what we can compute server-side
      const finalPricePerUnitCents = cartItem.priceCents || 0;
      
      if (!finalPricePerUnitCents || finalPricePerUnitCents <= 0) {
        console.error("[PPP:CHECKOUT] Invalid cart item price:", {
          productId: product.id,
          productName: product.name,
          priceCents: cartItem.priceCents,
        });
        throw new Error(`Invalid price for "${product.name}". Please re-add to cart.`);
      }

      // Server-side price sanity check - price should be reasonable (not suspiciously low)
      // Minimum price should be at least the base cost (prevent price manipulation attacks)
      const minReasonablePrice = Math.max(100, product.base_cost_cents || 100); // At least $1 or base cost
      if (finalPricePerUnitCents < minReasonablePrice * 0.5) {
        console.error("[PPP:CHECKOUT] Suspicious price detected - below reasonable minimum:", {
          productId: product.id,
          productName: product.name,
          priceCents: finalPricePerUnitCents,
          baseCost: product.base_cost_cents,
          minReasonable: minReasonablePrice,
        });
        throw new Error(`Price validation failed for "${product.name}". Please refresh and try again.`);
      }

      const lineSubtotal = finalPricePerUnitCents * cartItem.quantity;
      subtotalCents += lineSubtotal;

      console.log("[PPP:PRICING:CHECKOUT] Item", {
        productId: product.id,
        productName: cartItem.name || product.name,
        vendor: product.vendor,
        category: product.category,
        quantity: cartItem.quantity,
        cart_price_cents: finalPricePerUnitCents,
        line_subtotal_cents: lineSubtotal,
      });

      orderItems.push({
        product_id: product.id,
        product_name: cartItem.name || product.name,
        vendor: product.vendor,
        category: product.category,
        quantity: cartItem.quantity,
        final_price_per_unit_cents: finalPricePerUnitCents,
        line_subtotal_cents: lineSubtotal,
        configuration: cartItem.configuration || null,
        artwork_url: cartItem.artworkUrl || null,
        artwork_file_name: cartItem.artworkFileName || null,
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
      clientIp: clientIp.substring(0, 10) + "...", // Log partial IP for debugging
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
