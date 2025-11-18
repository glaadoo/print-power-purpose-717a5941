// PPP ADMIN SETTINGS
// Updates the admin passcode
// Requires current passcode for authentication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentPasscode, newPasscode } = await req.json();
    
    if (!currentPasscode || !newPasscode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Current and new passcode are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    // Verify current passcode
    const ADMIN_PASSCODE = Deno.env.get('ADMIN_PASSCODE') || 'Kenziewoof2025';
    
    if (currentPasscode !== ADMIN_PASSCODE) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid current passcode' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }
    
    // Validate new passcode
    if (newPasscode.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'New passcode must be at least 8 characters' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    // NOTE: In a real implementation, you would update the ADMIN_PASSCODE secret
    // via Supabase Vault API or CLI. For now, this function validates the request
    // and returns instructions for manual update.
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Passcode validation successful',
        instructions: 'To complete the update, please update the ADMIN_PASSCODE secret in your Supabase project settings or via CLI: supabase secrets set ADMIN_PASSCODE="' + newPasscode + '"'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Update passcode error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
