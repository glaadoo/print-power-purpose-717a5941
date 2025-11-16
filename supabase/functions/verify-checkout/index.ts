import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  // Get Stripe mode from database
  let stripeMode = "test";
  try {
    const modeResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.stripe_mode&select=value`, {
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`
      }
    });
    const modeData = await modeResponse.json();
    stripeMode = modeData[0]?.value || "test";
  } catch (error) {
    console.error('[VERIFY_CHECKOUT] Failed to fetch Stripe mode, using test:', error);
  }
  
  const STRIPE_KEY = ((stripeMode === "live" 
    ? Deno.env.get('STRIPE_SECRET_KEY_LIVE') 
    : Deno.env.get('STRIPE_SECRET_KEY_TEST')) ?? '').trim();

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  try {
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const sessionId = (body.session_id || url.searchParams.get('session_id') || '').toString();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!STRIPE_KEY) {
      return new Response(JSON.stringify({ error: 'Stripe key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch checkout session from Stripe
    const stripeResp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${STRIPE_KEY}`,
      },
    });

    const session = await stripeResp.json();
    if (!stripeResp.ok) {
      console.error('[VERIFY_CHECKOUT] Stripe lookup failed', session);
      return new Response(JSON.stringify({ error: session?.error?.message || 'Failed to verify payment' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic validation of payment success
    const paid = session?.payment_status === 'paid' || session?.status === 'complete';
    if (!paid) {
      return new Response(JSON.stringify({ error: 'Payment not completed yet' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderNumber: string = session?.metadata?.order_number || `ORD-${Date.now()}`;
    const productName: string | null = session?.metadata?.product_name ?? null;
    const quantity: number = parseInt(session?.metadata?.quantity ?? '1');
    const donationCents: number = parseInt(session?.metadata?.donation_cents ?? '0') || 0;
    const causeId: string | null = session?.metadata?.cause_id ?? null;
    const causeName: string | null = session?.metadata?.cause_name ?? null;

    const amountTotal: number = session?.amount_total || 0;
    const currency: string = session?.currency || 'usd';
    const customerEmail: string | null = session?.customer_details?.email ?? null;

    // Check for existing order by session_id or order_number
    const existing = await supabase
      .from('orders')
      .select('*')
      .or(`session_id.eq.${sessionId},order_number.eq.${orderNumber}`)
      .maybeSingle();

    if (existing.error && existing.error.code !== 'PGRST116') {
      console.error('[VERIFY_CHECKOUT] select error', existing.error);
    }

    let orderId: string | null = existing.data?.id ?? null;

    if (orderId) {
      // Update existing order
      const { error: updErr } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          customer_email: customerEmail,
          amount_total_cents: amountTotal,
          currency,
          product_name: productName,
          donation_cents: donationCents,
          quantity,
          cause_id: causeId,
          cause_name: causeName,
          session_id: sessionId,
          payment_mode: stripeMode,
        })
        .eq('id', orderId);

      if (updErr) {
        console.error('[VERIFY_CHECKOUT] update order error', updErr);
      }
    } else {
      // Create order
      const insertRes = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          session_id: sessionId,
          status: 'completed',
          customer_email: customerEmail,
          currency,
          amount_total_cents: amountTotal,
          donation_cents: donationCents,
          quantity,
          product_name: productName,
          cause_id: causeId,
          cause_name: causeName,
          payment_mode: stripeMode,
        })
        .select('id')
        .single();

      if (insertRes.error) {
        console.error('[VERIFY_CHECKOUT] insert order error', insertRes.error);
      } else {
        orderId = insertRes.data?.id ?? null;
      }
    }

    // Donation handling (idempotent by order_id)
    if (orderId && causeId && donationCents > 0) {
      const existingDonation = await supabase
        .from('donations')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!existingDonation.data) {
        const insDonation = await supabase.from('donations').insert({
          order_id: orderId,
          cause_id: causeId,
          amount_cents: donationCents,
          customer_email: customerEmail,
        });
        if (insDonation.error) {
          console.error('[VERIFY_CHECKOUT] insert donation error', insDonation.error);
        } else {
          // Only increment if we actually inserted a donation
          const inc = await supabase.rpc('increment_cause_raised', {
            cause_uuid: causeId,
            amount: donationCents,
          });
          if (inc.error) {
            console.error('[VERIFY_CHECKOUT] increment cause error', inc.error);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, order_number: orderNumber, session_id: sessionId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[VERIFY_CHECKOUT] crashed', err);
    return new Response(JSON.stringify({ error: 'verification_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
