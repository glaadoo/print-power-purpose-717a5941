import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Input validation schema
const donationSchema = z.object({
  nonprofitId: z.string().uuid({ message: "Invalid nonprofit ID format" }),
  nonprofitName: z.string().trim().min(1).max(200, { message: "Nonprofit name must be 1-200 characters" }),
  nonprofitEin: z.string().trim().max(20).optional(),
  amountCents: z.number().int().positive().min(100).max(1000000, { message: "Amount must be between $1 and $10,000" }),
  customerEmail: z.string().email().max(255, { message: "Invalid email address" }),
});

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 5; // 5 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting check
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(clientIp)) {
    console.warn(`[RATE-LIMIT] IP ${clientIp} exceeded rate limit`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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

    // Get Stripe mode from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    let stripeMode = "test";
    try {
      const modeResponse = await fetch(`${supabaseUrl}/rest/v1/app_settings?key=eq.stripe_mode&select=value`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      });
      const modeData = await modeResponse.json();
      stripeMode = modeData[0]?.value || "test";
    } catch (error) {
      console.error('[MONTHLY_DONATION] Failed to fetch Stripe mode, using test:', error);
    }
    
    // Initialize Stripe with test or live key based on database setting
    const stripeKey = stripeMode === "live"
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Validate input with Zod
    const body = await req.json();
    let validatedData;
    
    try {
      validatedData = donationSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[VALIDATION] Input validation failed:', error.errors);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid input data',
            details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      throw error;
    }

    const {
      nonprofitId,
      nonprofitName,
      nonprofitEin,
      amountCents,
      customerEmail,
    } = validatedData;

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
      });
    }

    // Create a product for this monthly donation
    const product = await stripe.products.create({
      name: `Monthly Donation to ${nonprofitName}`,
      description: `Recurring monthly donation supporting ${nonprofitName}`,
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
      success_url: `${origin}/donate?nonprofit=${nonprofitId}&payment=success`,
      cancel_url: `${origin}/donate?nonprofit=${nonprofitId}`,
      metadata: {
        nonprofit_id: nonprofitId,
        nonprofit_name: nonprofitName,
        nonprofit_ein: nonprofitEin || "",
        customer_email: customerEmail,
        donation_type: "monthly_recurring",
        donation_cents: String(amountCents),
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
