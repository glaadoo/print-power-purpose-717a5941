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

    // Get Stripe mode
    const { data: modeSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stripe_mode")
      .single();

    const stripeMode = modeSetting?.value || "test";
    const stripeKeyEnv = stripeMode === "live" ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY_TEST";
    const stripeKey = Deno.env.get(stripeKeyEnv) || Deno.env.get("STRIPE_SECRET_KEY")!;
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

    // Generate clean order number using database function
    const { data: orderNumberData, error: orderNumError } = await supabase
      .rpc("generate_order_number");

    if (orderNumError) {
      console.error("Error generating order number:", orderNumError);
      throw new Error("Failed to generate order number");
    }

    const orderNumber = orderNumberData as string;

    // Create order record FIRST
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
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
      })
      .select("id")
      .single();

    if (orderError || !orderData) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
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
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
