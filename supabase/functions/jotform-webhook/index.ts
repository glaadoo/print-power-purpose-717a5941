import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('JOTFORM_WEBHOOK_SECRET');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the incoming form data
    const contentType = req.headers.get('content-type') || '';
    let payload: any;

    if (contentType.includes('application/json')) {
      payload = await req.json();
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await req.formData();
      payload = Object.fromEntries(formData);
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        // If not JSON, treat as form data string
        const params = new URLSearchParams(text);
        payload = Object.fromEntries(params);
      }
    }

    console.log('Jotform webhook payload received:', JSON.stringify(payload).substring(0, 500));
    console.log('Full payload keys:', Object.keys(payload));
    console.log('Payload sample:', JSON.stringify(payload, null, 2).substring(0, 2000));

    // Verify webhook secret if configured
    if (webhookSecret) {
      // Check query string first, then payload, then headers
      const url = new URL(req.url);
      const querySecret = url.searchParams.get('webhook_secret');
      const providedSecret = querySecret || payload.webhook_secret || req.headers.get('x-jotform-secret');
      
      if (providedSecret !== webhookSecret) {
        console.error('Invalid webhook secret');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Extract Jotform submission data
    // Jotform sends data in rawRequest or as direct fields
    let submission: any = payload.rawRequest || payload;

    // If rawRequest is a JSON string, parse it
    if (typeof submission === 'string') {
      try {
        submission = JSON.parse(submission);
      } catch {
        submission = {};
      }
    }

    // Helper to pull values from the "pretty" string
    const pretty: string | undefined = typeof payload.pretty === 'string' ? payload.pretty : undefined;
    const getFromPretty = (label: string) => {
      if (!pretty) return undefined;
      try {
        const safe = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`${safe}\s*:\s*([^,]+)`);
        return pretty.match(re)?.[1]?.trim();
      } catch {
        return undefined;
      }
    };

    // Generic finder by key substring in parsed submission
    const findByKey = (needle: string): any => {
      const n = needle.toLowerCase();
      for (const [k, v] of Object.entries(submission)) {
        if (k.toLowerCase().includes(n)) return v;
      }
      return undefined;
    };

    const formType = submission.formType || getFromPretty('Form Type (Hidden)') || getFromPretty('Form Type') || 'order';
    const customerEmail = submission.email || findByKey('email') || getFromPretty('Your Email Address');
    const productName = submission.product || findByKey('product') || getFromPretty('Product Name');
    const amountStr = (submission.amount ?? findByKey('number')) ?? getFromPretty('Amount') ?? '0';
    const donationStr = (submission.donation ?? findByKey('donation')) ?? getFromPretty('Donation Amount (Optional)') ?? '0';
    const amount = parseFloat(String(amountStr)) || 0;
    const donationAmount = parseFloat(String(donationStr)) || 0;
    const causeId = submission.causeId || findByKey('cause');
    const orderNumber = payload.submissionID || submission.submissionID || `JF-${Date.now()}`;

    console.log('Parsed submission:', {
      formType,
      customerEmail,
      amount,
      donationAmount,
      productName,
      causeId
    });

    // Create audit log entry
    await supabase.from('audit_log').insert({
      action: 'jotform_webhook_received',
      entity_type: 'webhook',
      entity_id: orderNumber,
      details: {
        formType,
        submissionId: orderNumber,
        rawPayload: JSON.stringify(payload).substring(0, 1000), // Limit size
      },
    });

    // Idempotency check: see if this submission was already processed
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (existingOrder) {
      console.log('Submission already processed, skipping:', orderNumber);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Submission already processed (idempotent)',
          orderNumber,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle based on form type
    if (formType === 'donation' || donationAmount > 0) {
      // Process donation
      const { error: donationError } = await supabase.from('donations').insert({
        customer_email: customerEmail,
        amount_cents: Math.round(donationAmount * 100),
        cause_id: causeId,
      });

      if (donationError) {
        console.error('Error creating donation:', donationError);
        throw donationError;
      }

      // Update cause raised amount if we have a cause
      if (causeId) {
        const { error: updateError } = await supabase.rpc('increment_cause_raised', {
          cause_uuid: causeId,
          amount: Math.round(donationAmount * 100),
        });

        if (updateError) {
          console.error('Error updating cause:', updateError);
        }
      }

      console.log('Donation processed successfully');
    }

    if (formType === 'order' || (amount > 0 && productName)) {
      // Process order
      const { error: orderError } = await supabase.from('orders').insert({
        order_number: orderNumber,
        customer_email: customerEmail,
        product_name: productName,
        amount_total_cents: Math.round(amount * 100),
        donation_cents: Math.round(donationAmount * 100),
        cause_id: causeId,
        status: 'pending',
        session_id: `jotform_${orderNumber}`,
      });

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      console.log('Order processed successfully');
    }

    // Send success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        orderNumber,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in jotform-webhook function:', error);
    
    // Log error to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('audit_log').insert({
        action: 'jotform_webhook_error',
        entity_type: 'webhook',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});