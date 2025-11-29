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

    // Fetch aggregated statistics efficiently
    const [ordersRes, donationsRes, causesRes, productsCountRes, storyRequestsCountRes] = await Promise.all([
      supabase.from("orders").select("id, status, amount_total_cents, donation_cents, created_at, customer_email, nonprofit_name, order_number").order("created_at", { ascending: false }).limit(100),
      supabase.from("donations").select("id, amount_cents, created_at, customer_email, nonprofit_name").order("created_at", { ascending: false }).limit(50),
      supabase.from("causes").select("id, name, raised_cents, goal_cents"),
      supabase.from("products").select("id", { count: 'exact', head: true }),
      supabase.from("story_requests").select("id", { count: 'exact', head: true })
    ]);

    const recentOrders = ordersRes.data || [];
    const recentDonations = donationsRes.data || [];
    const causes = causesRes.data || [];

    // Get total counts from all orders and donations
    const { count: totalOrdersCount } = await supabase.from("orders").select("*", { count: 'exact', head: true });
    const { count: totalDonationsCount } = await supabase.from("donations").select("*", { count: 'exact', head: true });

    // Calculate revenue from completed orders only
    const { data: completedOrdersData } = await supabase
      .from("orders")
      .select("amount_total_cents, donation_cents")
      .eq("status", "completed")
      .gt("amount_total_cents", 0);

    const completedOrders = completedOrdersData || [];
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount_total_cents || 0), 0);
    const checkoutDonations = completedOrders.reduce((sum, o) => sum + (o.donation_cents || 0), 0);

    // Calculate direct donations
    const { data: allDonationsData } = await supabase.from("donations").select("amount_cents");
    const directDonations = (allDonationsData || []).reduce((sum, d) => sum + (d.amount_cents || 0), 0);

    // Calculate statistics
    const stats = {
      totalRevenue,
      totalDonations: directDonations + checkoutDonations,
      totalOrders: completedOrders.length,
      totalDonationsCount: totalDonationsCount || 0,
      activeCauses: causes.filter(c => (c.raised_cents || 0) > 0).length,
      orders: recentOrders,
      donations: recentDonations,
      causes: causes,
      products: { count: productsCountRes.count || 0 },
      storyRequests: { count: storyRequestsCountRes.count || 0 }
    };

    return new Response(
      JSON.stringify(stats),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300" // Cache for 5 minutes
        } 
      }
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