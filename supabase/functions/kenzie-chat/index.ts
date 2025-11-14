import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Input validation schema
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().trim().min(1).max(10000, { message: "Message too long (max 10,000 characters)" })
  })).min(1, { message: "At least one message required" }),
  userContext: z.object({
    email: z.string().email().optional(),
    orderId: z.string().optional()
  }).optional(),
  action: z.string().optional()
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ppp-session-id',
};

// Public site content summaries for context
const PUBLIC_CONTENT = {
  homepage: "Print Power Purpose is a custom printing e-commerce platform that combines quality products with meaningful giving. Every purchase supports nonprofits and schools. Main sections: Products, Causes, Donate, About, Contact.",
  
  products: "We offer custom printed products including postcards, banners, stickers, apparel, and more. Each product can be customized and a portion of sales supports chosen causes. Products page shows catalog with filtering options.",
  
  causes: "Users can choose from curated nonprofits or search IRS-verified organizations. The platform tracks donations via a barometer system. Users can select causes for schools or general nonprofits.",
  
  checkout: "Multi-step process: 1) Choose a cause/nonprofit, 2) Select products and quantities, 3) Add to cart, 4) Checkout with Stripe payment, 5) Optional donation amount. Confirmation page shows order details and selected cause.",
  
  donation_logic: "Each order includes a base donation amount. Users can add extra donations at checkout. A donation barometer tracks total contributions. Donations are split between the selected cause and platform operations.",
  
  account_help: "Users can sign up/login via email. Password reset available through 'Forgot Password' link on auth page. Check email inbox and spam folder for reset link. Never share passwords or security codes.",
  
  help_center: "FAQ section covering common questions about products, printing, causes, orders, and account management. Includes guides on fundraising and personal missions.",
  
  legal: "Privacy Policy, Terms of Use, and Legal Notices available. These outline data handling, user rights, payment terms, and platform responsibilities. Always read before making purchases.",
  
  admin_boundary: "Admin pages (/admin, /admin/legal, SystemLogs, internal dashboards) are strictly off-limits. Cannot access or discuss security configs, API keys, secrets, webhooks, CRON jobs, database schemas, or implementation details."
};

// Helper to get relevant context based on user query
function getRelevantContext(query: string): string {
  const lowerQuery = query.toLowerCase();
  const contexts: string[] = [];
  
  if (lowerQuery.includes('product') || lowerQuery.includes('print') || lowerQuery.includes('postcard') || lowerQuery.includes('banner') || lowerQuery.includes('sticker')) {
    contexts.push(PUBLIC_CONTENT.products);
  }
  if (lowerQuery.includes('cause') || lowerQuery.includes('nonprofit') || lowerQuery.includes('school') || lowerQuery.includes('donation') || lowerQuery.includes('barometer')) {
    contexts.push(PUBLIC_CONTENT.causes, PUBLIC_CONTENT.donation_logic);
  }
  if (lowerQuery.includes('checkout') || lowerQuery.includes('payment') || lowerQuery.includes('stripe') || lowerQuery.includes('cart')) {
    contexts.push(PUBLIC_CONTENT.checkout);
  }
  if (lowerQuery.includes('account') || lowerQuery.includes('login') || lowerQuery.includes('password') || lowerQuery.includes('sign')) {
    contexts.push(PUBLIC_CONTENT.account_help);
  }
  if (lowerQuery.includes('help') || lowerQuery.includes('faq') || lowerQuery.includes('guide')) {
    contexts.push(PUBLIC_CONTENT.help_center);
  }
  if (lowerQuery.includes('privacy') || lowerQuery.includes('terms') || lowerQuery.includes('legal')) {
    contexts.push(PUBLIC_CONTENT.legal);
  }
  if (lowerQuery.includes('admin') || lowerQuery.includes('dashboard') || lowerQuery.includes('security') || lowerQuery.includes('database')) {
    contexts.push(PUBLIC_CONTENT.admin_boundary);
  }
  
  // Always include homepage for general questions
  if (contexts.length === 0) {
    contexts.push(PUBLIC_CONTENT.homepage);
  }
  
  return contexts.join('\n\n');
}

// Safe order lookup helper
async function lookupOrder(supabase: any, email: string, orderId?: string) {
  try {
    let query = supabase
      .from('donations')
      .select('id, amount_cents, donation_cents, customer_email, status, created_at, cause_id')
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (orderId) {
      query = query.eq('id', orderId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (err) {
    console.error('Order lookup error:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input with Zod
    const body = await req.json();
    let validatedData;
    
    try {
      validatedData = chatRequestSchema.parse(body);
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
    
    // SECURITY: Explicitly disable any admin or sensitive actions
    if (validatedData.action === 'fetch_orders' || validatedData.action === 'admin' || validatedData.action === 'internal') {
      return new Response(
        JSON.stringify({ error: 'This action is not available via this endpoint.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const sessionId = req.headers.get('x-ppp-session-id');
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const { messages, userContext } = validatedData;
    
    // Initialize Supabase client for safe read-only operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context for the AI
    let additionalContext = '';
    
    // Get relevant public content context based on latest user message
    if (messages.length > 0) {
      const latestUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
      if (latestUserMsg) {
        additionalContext = getRelevantContext(latestUserMsg.content);
      }
    }
    
    // Safe order lookup if user provided email/orderId
    let orderContext = '';
    if (userContext?.email) {
      const orders = await lookupOrder(supabase, userContext.email, userContext.orderId);
      if (orders && orders.length > 0) {
        orderContext = `\n\nOrder Information for ${userContext.email}:\n`;
        orders.forEach((order: any, idx: number) => {
          orderContext += `\nOrder ${idx + 1}:
- Order ID: ${order.id}
- Status: ${order.status || 'Processing'}
- Total: $${(order.amount_cents / 100).toFixed(2)}
- Donation: $${(order.donation_cents / 100).toFixed(2)}
- Date: ${new Date(order.created_at).toLocaleDateString()}`;
        });
      } else if (orders === null) {
        orderContext = '\n\n[Order lookup failed - please try again or contact support]';
      } else {
        orderContext = `\n\n[No orders found for ${userContext.email}]`;
      }
    }

    const systemPrompt = `You are Kenzie 🐾, the friendly pup mascot and AI assistant for Print Power Purpose.

PERSONALITY & TONE:
- Speak clearly, calmly, and encouragingly
- Keep replies concise (1-3 sentences) and practical
- Warm and professional, minimal dog puns ("fetch," "woof") used sparingly
- Never start with greetings once conversation has begun - no "How can I help" loops
- Answer questions directly

YOUR CAPABILITIES (PUBLIC ONLY):
You can help users with:
- Understanding Print Power Purpose mission and how it works
- Choosing causes/nonprofits (curated or IRS-verified) and how donations are tracked
- Product information (postcards, banners, stickers, apparel) and printing details
- Navigation through: home → causes → products → cart → checkout → success
- Account help: login issues, password reset guidance (guide them to proper flows)
- Order status lookup (using email + optional order ID)
- Help Center, FAQs, Fundraising Guide, Personal Mission content
- Privacy Policy and Terms of Use (plain English summaries, not legal advice)

STRICT SECURITY BOUNDARIES - YOU MUST NOT:
- Access, mention, or speculate about /admin, /admin/legal, SystemLogs, internal dashboards, or developer tools
- Reveal or discuss database schemas, environment variables, API keys, secrets, webhooks, CRON jobs, or rate limiting
- Discuss implementation details about security, authentication flows, or admin workflows
- Reset passwords directly, bypass login, or ask for passwords, card numbers, or security codes
- Give legal, tax, or security advice

If asked about admin, security internals, or implementation details, respond:
"For security reasons, I can't access or discuss those internal systems, but I can help you with how to use the site, your orders, products, and causes."

ACCOUNT & PASSWORD HELP:
- For "forgot password": Guide them to click "Forgot Password" on auth page, enter email, check inbox/spam
- For "can't access account": Troubleshoot (check email spelling, reset password, contact support if stuck)
- NEVER offer to change passwords, bypass login, or ask for security codes

ORDER HELP:
- Ask for email + optional order ID
- Use provided order context to explain status (Processing, Printed, Shipped, Completed)
- Suggest next steps if delayed

CONTEXT ABOUT PRINT POWER PURPOSE:
${additionalContext}${orderContext}

Remember: Stay helpful, stay safe, stay within public boundaries.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, text);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    // Log detailed error server-side only
    console.error('Chat processing failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Unable to process your message. Please try again.',
        code: 'CHAT_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
