import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const body = await req.json();
    const {
      causeId,
      causeName,
      amountCents,
      customerEmail,
      firstName,
      lastName,
      phone,
      address,
    } = body;

    if (!causeId || !causeName || !amountCents || !customerEmail) {
      throw new Error("Missing required fields");
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        name: `${firstName} ${lastName}`.trim(),
        phone: phone || undefined,
        address: address ? {
          line1: address.street,
          line2: address.apartment || undefined,
          city: address.city,
          state: address.state,
          postal_code: address.zipCode,
          country: address.country === "United States" ? "US" : address.country,
        } : undefined,
      });
    }

    // Create a product for this monthly donation
    const product = await stripe.products.create({
      name: `Monthly Donation to ${causeName}`,
      description: `Recurring monthly donation supporting ${causeName}`,
    });

    // Create a price for the monthly subscription
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountCents,
      currency: "usd",
      recurring: {
        interval: "month",
      },
    });

    // Create the checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      success_url: `${origin}/donate?cause=${causeId}&payment=success`,
      cancel_url: `${origin}/donate?cause=${causeId}`,
      metadata: {
        cause_id: causeId,
        cause_name: causeName,
        customer_email: customerEmail,
        donation_type: "monthly_recurring",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating monthly donation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
