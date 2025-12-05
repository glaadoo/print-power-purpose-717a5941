import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AdminAuthResult {
  authenticated: boolean;
  error?: string;
  status?: number;
}

/**
 * Validates admin session token from request body.
 * Returns authentication result with error message if failed.
 */
export async function validateAdminSession(
  body: { adminSessionToken?: string } | null
): Promise<AdminAuthResult> {
  const sessionToken = body?.adminSessionToken;

  if (!sessionToken) {
    return {
      authenticated: false,
      error: "Admin authentication required. Missing adminSessionToken.",
      status: 401,
    };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Verify session token exists and is not expired
  const { data: session, error } = await supabase
    .from("admin_sessions")
    .select("*")
    .eq("token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !session) {
    console.log("[ADMIN-AUTH] Invalid or expired session token");
    return {
      authenticated: false,
      error: "Invalid or expired admin session. Please re-authenticate.",
      status: 401,
    };
  }

  console.log("[ADMIN-AUTH] Session validated successfully");
  return { authenticated: true };
}

/**
 * Creates an unauthorized response with CORS headers
 */
export function createUnauthorizedResponse(
  message: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
