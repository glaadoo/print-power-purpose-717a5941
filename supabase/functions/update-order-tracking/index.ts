/**
 * Update Order Tracking
 * Secure admin endpoint to update tracking information for orders
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateTrackingRequest {
  orderId: string;
  tracking_number?: string;
  tracking_url?: string;
  tracking_carrier?: string;
  shipping_status?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[UPDATE-TRACKING] Received request');

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is admin (check user_roles table)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: UpdateTrackingRequest = await req.json();
    console.log('[UPDATE-TRACKING] Request body:', body);

    if (!body.orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updateData: any = {};
    if (body.tracking_number !== undefined) updateData.tracking_number = body.tracking_number;
    if (body.tracking_url !== undefined) updateData.tracking_url = body.tracking_url;
    if (body.tracking_carrier !== undefined) updateData.tracking_carrier = body.tracking_carrier;
    if (body.shipping_status !== undefined) updateData.shipping_status = body.shipping_status;

    // Set shipped_at timestamp when status changes to shipped
    if (body.shipping_status && ['shipped', 'in_transit'].includes(body.shipping_status)) {
      // Check if order was previously in pending status
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('shipping_status, shipped_at')
        .eq('id', body.orderId)
        .single();

      if (existingOrder && existingOrder.shipping_status === 'pending' && !existingOrder.shipped_at) {
        updateData.shipped_at = new Date().toISOString();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tracking data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[UPDATE-TRACKING] Updating order with:', updateData);

    // Update order with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: updatedOrder, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', body.orderId)
      .select()
      .single();

    if (error) {
      console.error('[UPDATE-TRACKING] Database error:', error);
      throw error;
    }

    console.log('[UPDATE-TRACKING] Successfully updated order');

    // If tracking was added or shipping status changed, send notification
    if (updatedOrder && (body.tracking_number || body.shipping_status)) {
      console.log('[UPDATE-TRACKING] Triggering shipping notification');
      
      // Call shipping notification function asynchronously (don't wait for it)
      supabaseAdmin.functions
        .invoke('send-shipping-notification', {
          body: { order: updatedOrder },
        })
        .then(({ error: notifError }) => {
          if (notifError) {
            console.error('[UPDATE-TRACKING] Notification error:', notifError);
          } else {
            console.log('[UPDATE-TRACKING] Notification sent successfully');
          }
        });
    }

    return new Response(
      JSON.stringify({ success: true, order: updatedOrder }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[UPDATE-TRACKING] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update tracking' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
