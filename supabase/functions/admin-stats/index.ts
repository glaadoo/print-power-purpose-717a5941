import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin session
    const { sessionToken } = await req.json();
    
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: "Session token required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the session token is valid
    console.log('[admin-stats] Checking session token:', sessionToken ? sessionToken.substring(0, 8) + '...' : 'NULL');
    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .select("*")
      .eq("token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    console.log('[admin-stats] Session query result:', session ? 'FOUND' : 'NOT FOUND', sessionError);

    if (!session) {
      console.error('[admin-stats] Invalid session - no matching token found');
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all data using service role
    const [ordersRes, donationsRes, causesRes, productsRes, storyRequestsRes] = await Promise.all([
      supabase.from("orders").select("*"),
      supabase.from("donations").select("*"),
      supabase.from("causes").select("*"),
      supabase.from("products").select("*"),
      supabase.from("story_requests").select("*")
    ]);

    const orders = ordersRes.data || [];
    const donations = donationsRes.data || [];
    const causes = causesRes.data || [];

    // Filter only completed/paid orders (exclude pending orders with $0)
    const completedOrders = orders.filter(o => 
      o.status === 'completed' && (o.amount_total_cents || 0) > 0
    );

    // Calculate total donations from both direct donations and checkout donations
    const directDonations = donations.reduce((sum, d) => sum + (d.amount_cents || 0), 0);
    const checkoutDonations = completedOrders.reduce((sum, o) => sum + (o.donation_cents || 0), 0);

    // Calculate statistics
    const stats = {
      totalRevenue: completedOrders.reduce((sum, o) => sum + (o.amount_total_cents || 0), 0),
      totalDonations: directDonations + checkoutDonations,
      totalOrders: completedOrders.length,
      totalDonationsCount: donations.length,
      activeCauses: causes.filter(c => (c.raised_cents || 0) > 0).length,
      orders: orders,
      donations: donations,
      causes: causes,
      products: productsRes.data || [],
      storyRequests: storyRequestsRes.data || []
    };

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-stats:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});