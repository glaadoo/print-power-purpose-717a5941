import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all causes
    const { data: causes, error: causesError } = await supabase
      .from('causes')
      .select('*');

    if (causesError) {
      throw causesError;
    }

    const triggeredCauses = [];

    // Check each cause for $777 threshold
    for (const cause of causes || []) {
      const raisedDollars = (cause.raised_cents || 0) / 100;
      
      // Check if reached $777 threshold
      if (raisedDollars >= 777) {
        // Check if story request already exists
        const { data: existingRequest } = await supabase
          .from('story_requests')
          .select('id')
          .eq('cause_id', cause.id)
          .maybeSingle();

        if (!existingRequest) {
          // Create story request
          const { data: storyRequest, error: storyError } = await supabase
            .from('story_requests')
            .insert({
              cause_id: cause.id,
              contact_email: 'admin@printpowerpurpose.com', // Default admin email
              status: 'pending',
              notes: `Cause reached $${raisedDollars.toFixed(2)} - threshold trigger`,
            })
            .select()
            .single();

          if (storyError) {
            console.error('Error creating story request:', storyError);
          } else {
            triggeredCauses.push(cause);
            console.log(`Story request created for cause: ${cause.name}`);

            // Send notification email to admin
            try {
              await resend.emails.send({
                from: 'Print Power Purpose <onboarding@resend.dev>',
                to: ['admin@printpowerpurpose.com'], // Replace with actual admin email
                subject: `🎉 Cause Milestone Reached: ${cause.name}`,
                html: `
                  <!DOCTYPE html>
                  <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px;">
                          <h1>🎉 Milestone Achieved!</h1>
                        </div>
                        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                          <h2>${cause.name} has reached $777!</h2>
                          <p><strong>Total Raised:</strong> $${raisedDollars.toFixed(2)}</p>
                          <p><strong>Goal:</strong> $${((cause.goal_cents || 0) / 100).toFixed(2)}</p>
                          
                          <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
                            <h3>Next Steps:</h3>
                            <ol>
                              <li>Contact the nonprofit/school for their story</li>
                              <li>Request photos and testimonials</li>
                              <li>Prepare content for Pressmaster.ai</li>
                            </ol>
                          </div>
                          
                          <p style="margin-top: 30px; text-align: center;">
                            <a href="${Deno.env.get('SUPABASE_URL')}/admin" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                              View Story Request
                            </a>
                          </p>
                        </div>
                      </div>
                    </body>
                  </html>
                `,
              });
              console.log(`Notification email sent for ${cause.name}`);
            } catch (emailErr) {
              console.error('Failed to send notification email:', emailErr);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        evaluatedCauses: causes?.length || 0,
        triggeredCauses: triggeredCauses.length,
        causes: triggeredCauses.map(c => ({ id: c.id, name: c.name, raised: c.raised_cents / 100 })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in checkdrop-evaluate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});