import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting for brute force protection
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10; // 10 attempts per minute per IP

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

async function logAccess(
  supabase: any,
  path: string,
  ip: string,
  userAgent: string | null,
  success: boolean,
  reason: string,
  providedKey?: string,
  userId?: string,
  userEmail?: string
) {
  await supabase.from('admin_access_logs').insert({
    path,
    ip_address: ip,
    user_agent: userAgent,
    success,
    reason,
    provided_key: providedKey ? providedKey.substring(0, 10) + '...' : null,
    user_id: userId || null,
    user_email: userEmail || null,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent");

  // Rate limiting check
  if (!checkRateLimit(clientIp)) {
    console.warn(`[RATE-LIMIT] IP ${clientIp} exceeded admin passcode rate limit`);
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: "Too many attempts. Please try again later.",
        code: 'RATE_LIMIT'
      }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { passcode, path, sessionToken } = await req.json();
    const adminPasscode = Deno.env.get('ADMIN_PASSCODE');
    const adminRoleEnabled = Deno.env.get('ADMIN_ROLE_ENABLED') === 'true';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!adminPasscode) {
      throw new Error('ADMIN_PASSCODE not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // OPTION A: Passcode-only mode (default)
    if (!adminRoleEnabled) {
      // Check if using old session token system
      if (sessionToken) {
        const { data } = await supabase
          .from('admin_sessions')
          .select('*')
          .eq('token', sessionToken)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (data) {
          await logAccess(supabase, path || '/admin', clientIp, userAgent, true, 'valid_session_token');
          return new Response(
            JSON.stringify({ valid: true, mode: 'session' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check passcode
      if (passcode === adminPasscode) {
        await logAccess(supabase, path || '/admin', clientIp, userAgent, true, 'valid_passcode');
        return new Response(
          JSON.stringify({ valid: true, mode: 'passcode' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await logAccess(supabase, path || '/admin', clientIp, userAgent, false, 'invalid_passcode', passcode);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid passcode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OPTION B: Role-based mode (requires auth + passcode)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      await logAccess(supabase, path || '/admin', clientIp, userAgent, false, 'not_logged_in', passcode);
      return new Response(
        JSON.stringify({ valid: false, error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify passcode first
    if (passcode !== adminPasscode) {
      await logAccess(supabase, path || '/admin', clientIp, userAgent, false, 'invalid_passcode', passcode);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid passcode' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      await logAccess(supabase, path || '/admin', clientIp, userAgent, false, 'invalid_auth', passcode);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      await logAccess(supabase, path || '/admin', clientIp, userAgent, false, 'not_admin_role', passcode, user.id, user.email);
      return new Response(
        JSON.stringify({ valid: false, error: 'Admin role required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success - both passcode and role verified
    await logAccess(supabase, path || '/admin', clientIp, userAgent, true, 'valid_passcode_and_role', undefined, user.id, user.email);
    return new Response(
      JSON.stringify({ valid: true, mode: 'role', user: { id: user.id, email: user.email } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin passcode verification failed:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Verification failed',
        code: 'AUTH_ERROR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
