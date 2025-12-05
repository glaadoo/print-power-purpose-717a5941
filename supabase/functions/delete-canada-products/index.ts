import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for admin auth
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    
    // ADMIN AUTH: Validate admin session token
    const adminSessionToken = body.adminSessionToken;
    if (!adminSessionToken) {
      console.log("[DELETE-CANADA-PRODUCTS] Unauthorized: Missing admin session token");
      return new Response(
        JSON.stringify({ success: false, error: "Admin authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .select("*")
      .eq("token", adminSessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.log("[DELETE-CANADA-PRODUCTS] Unauthorized: Invalid or expired session");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired admin session" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[DELETE-CANADA-PRODUCTS] Admin session validated");

    // First count how many products match
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('vendor', 'sinalite')
      .ilike('name', '%canada%');

    if (countError) {
      console.error('Count error:', countError);
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${count} SinaLite Canada products to delete`);

    // Delete the products
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('vendor', 'sinalite')
      .ilike('name', '%canada%');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully deleted ${count} SinaLite Canada products`);

    return new Response(JSON.stringify({ 
      success: true, 
      deleted: count,
      message: `Deleted ${count} SinaLite products containing "canada" in the title`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
