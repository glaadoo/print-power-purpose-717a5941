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
    
    // SECURITY: Order lookup is disabled on this public endpoint
    if (body.action === 'fetch_orders') {
      return new Response(
        JSON.stringify({ error: 'Order lookup is not available via this endpoint.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
- If you cannot understand the user's request or it's completely unclear, respond with: "I'm not quite sure what you're asking for. Could you please rephrase that or choose one of the options I can help with?" Then respond with EXACTLY: "SHOW_OPTIONS"
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
