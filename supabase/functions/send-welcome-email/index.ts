import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to: ${email} (${firstName} ${lastName})`);

    const emailResponse = await resend.emails.send({
      from: "Print Power Purpose <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Print Power Purpose! 🐾",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #FF8C42 0%, #FFB347 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                letter-spacing: 0.1em;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .greeting {
                font-size: 20px;
                color: #FF8C42;
                margin-bottom: 20px;
              }
              .cta-button {
                display: inline-block;
                background: #FF8C42;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                margin: 20px 0;
              }
              .features {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .feature {
                margin: 15px 0;
                padding-left: 25px;
                position: relative;
              }
              .feature:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #FF8C42;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PRINT POWER PURPOSE</h1>
            </div>
            <div class="content">
              <div class="greeting">Hi ${firstName}! 🐾</div>
              
              <p>Welcome to Print Power Purpose! We're thrilled to have you join our community of changemakers.</p>
              
              <p>Your account has been successfully created, and we've saved your information to make checkout seamless. Now every print order you make can support a cause you care about!</p>
              
              <div class="features">
                <h3 style="color: #FF8C42; margin-top: 0;">What You Can Do:</h3>
                <div class="feature">Browse our professional print products</div>
                <div class="feature">Choose a cause to support with each order</div>
                <div class="feature">Track your impact on the causes you care about</div>
                <div class="feature">Enjoy seamless checkout with your saved information</div>
              </div>
              
              <p style="text-align: center;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovableproject.com") || "https://yoursite.com"}/welcome" class="cta-button">
                  Get Started Now
                </a>
              </p>
              
              <p><strong>Meet Kenzie 🐾</strong><br>
              Our friendly mascot is ready to help you get started. Kenzie will guide you through selecting what you're printing for today!</p>
              
              <p>If you have any questions, our team is here to help. Just reply to this email.</p>
              
              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>The Print Power Purpose Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Print Power Purpose. All rights reserved.</p>
              <p>Making an impact, one print at a time.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
