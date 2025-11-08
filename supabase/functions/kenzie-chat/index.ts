import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ppp-session-id',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Handle order fetching action
    if (body.action === 'fetch_orders') {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase configuration missing');
      }

      const emailRaw = String(body.email ?? '').trim();
      const emailLower = emailRaw.toLowerCase();
      if (!emailLower) {
        return new Response(JSON.stringify({ orders: [], error: 'Email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('order_number, session_id, product_name, quantity, amount_total_cents, donation_cents, created_at, status, customer_email')
        .ilike('customer_email', `%${emailLower}%`)
        .order('created_at', { ascending: false});

      if (error) {
        console.error('fetch_orders error', { email: emailLower, error });
        return new Response(JSON.stringify({ orders: [], error: 'Failed to fetch orders' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let results = orders ?? [];

      // Fallback: include donation records tied to this email (mapped to order-like objects)
      if (results.length === 0) {
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('amount_cents, created_at, customer_email')
          .ilike('customer_email', `%${emailLower}%`)
          .order('created_at', { ascending: false });

        if (donationsError) {
          console.error('fetch_orders donations fallback error', { email: emailLower, error: donationsError });
        } else if (donations && donations.length > 0) {
          const donationOrders = donations.map((d) => ({
            order_number: 'DONATION',
            session_id: null,
            product_name: 'Donation',
            quantity: 1,
            amount_total_cents: d.amount_cents,
            donation_cents: 0,
            created_at: d.created_at,
            status: 'completed',
            customer_email: d.customer_email,
          }));
          results = donationOrders;
        }
      }
      // Enrich missing product details via Stripe if needed
      const STRIPE_KEY = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').trim();
      if (STRIPE_KEY && results.length > 0) {
        for (const order of results as Array<any>) {
          const missing = !order.product_name || order.product_name === 'NA';
          if (missing && order.session_id) {
            try {
              const resp = await fetch(
                `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(order.session_id)}?expand[]=line_items.data.price.product`,
                { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
              );
              if (resp.ok) {
                const session = await resp.json();
                const items = session?.line_items?.data
                  ?.map((li: any) => {
                    const name = li?.price?.product?.name || li?.description || 'Item';
                    const qty = li?.quantity ?? 1;
                    return { name, quantity: qty };
                  })
                  // Filter out donation items - they should only show in the donation field
                  .filter((item: any) => !item.name.toLowerCase().includes('donation')) ?? [];
                if (items.length > 0) {
                  (order as any).items = items;
                  order.product_name = items
                    .map((i: any) => (i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name))
                    .join(', ');
                  // Aggregate quantity for display when multiple items
                  order.quantity = items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || order.quantity;
                }
              } else {
                const t = await resp.text();
                console.error('fetch_orders stripe line_items failed', { status: resp.status, body: t });
              }
            } catch (e) {
              console.error('fetch_orders stripe error', e);
            }
          }
        }
      }

      console.log('fetch_orders', { email: emailLower, count: results.length });
      return new Response(JSON.stringify({ orders: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle chat AI flow
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const sessionId = req.headers.get('x-ppp-session-id');
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const { messages } = body;

    const systemPrompt = `You are Kenzie 🐾, a friendly AI assistant for Print Power Purpose.

Rules:
- Never start with a greeting once the conversation has begun. No "How can I help" loops.
- Answer the latest user message directly in 1–3 short sentences.
- If the request is vague (e.g., "donations"), give 2-3 concise facts and ask ONE targeted follow-up question.
- For orders, immediately ask: "Please share your order number or the email used, and I'll fetch the status."
- If you cannot understand or help with a request, respond with EXACTLY: "FALLBACK_GREETING"
- Avoid listing capabilities or repeating your intro.

Context guidance:
- Donations: briefly explain how customers select a cause and that a portion of each order supports it; ask whether it's for a school or nonprofit. Each order includes an optional donation amount, defaulting to $0 if not provided.
- Navigation: point users to the most direct next step (e.g., where to choose a cause or proceed to checkout).

Tone: warm, professional, minimal dog puns ("fetch," "woof") used sparingly.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('kenzie-chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
