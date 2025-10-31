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
    const submission = payload.rawRequest || payload;
    
    // Map Jotform fields to our database structure
    // Jotform submission format uses q{number}_fieldName pattern
    // We need to search through all keys to find the actual form data
    let formData: any = {};
    
    // Extract all q{number} fields from the submission
    Object.keys(submission).forEach(key => {
      if (key.startsWith('q') && !key.includes('_')) {
        // This is a question field, map it
        const value = submission[key];
        if (typeof value === 'object' && value !== null) {
          // Could be email, name, or other complex field
          if (value.email) formData.email = value.email;
          if (value.first) formData.firstName = value.first;
          if (value.last) formData.lastName = value.last;
        } else {
          formData[key] = value;
        }
      }
    });
    
    const formType = submission.formType || 'order';
    const customerEmail = formData.email || submission.email;
    const customerName = formData.firstName && formData.lastName 
      ? `${formData.firstName} ${formData.lastName}` 
      : submission.name;
    const amount = parseFloat(submission.amount || '0');
    const donationAmount = parseFloat(submission.donation || '0');
    const productName = submission.product || formData.product;
    const causeId = submission.causeId || formData.causeId;
    const orderNumber = submission.submissionID || `JF-${Date.now()}`;

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