import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🎬 Weekly story post job triggered");

    // Verify cron secret for security
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error("❌ Unauthorized: Invalid or missing cron secret");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all completed story requests that haven't been posted yet
    const { data: completedStories, error: fetchError } = await supabase
      .from('story_requests')
      .select(`
        id,
        cause_id,
        video_url,
        milestone_amount,
        contact_email,
        notes,
        created_at,
        causes (
          name,
          description
        )
      `)
      .eq('status', 'completed')
      .not('video_url', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error("Error fetching completed stories:", fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${completedStories?.length || 0} completed stories to process`);

    if (!completedStories || completedStories.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No completed stories to post',
          processed: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each story
    const results = [];
    
    for (const story of completedStories) {
      try {
        const causeName = (story.causes as any)?.name || 'Unknown Cause';
        console.log(`Processing story ${story.id} for cause: ${causeName}`);

        // Here you can add integrations:
        // 1. Post to social media (Twitter, Facebook, Instagram)
        // 2. Send email notifications to supporters
        // 3. Create blog posts
        // 4. Add to newsletter queue
        
        // For now, we'll mark as posted and log
        const { error: updateError } = await supabase
          .from('story_requests')
          .update({ 
            status: 'posted',
            notes: `${story.notes || ''}\n\nPosted on ${new Date().toISOString()}`
          })
          .eq('id', story.id);

        if (updateError) {
          console.error(`Error updating story ${story.id}:`, updateError);
          results.push({
            story_id: story.id,
            success: false,
            error: updateError.message
          });
        } else {
          console.log(`✅ Successfully posted story ${story.id}`);
          results.push({
            story_id: story.id,
            success: true,
            cause_name: causeName,
            milestone: story.milestone_amount / 100
          });
        }
      } catch (error) {
        console.error(`Error processing story ${story.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          story_id: story.id,
          success: false,
          error: errorMessage
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✨ Weekly story post completed: ${successCount}/${results.length} stories posted`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Posted ${successCount} stories`,
        processed: results.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("❌ Error in weekly story post:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});