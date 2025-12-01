import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  type: "signup" | "email_change";
  newEmail?: string; // For email change verification
  firstName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-verification-email] Request received");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, newEmail, firstName }: VerificationEmailRequest = await req.json();
    console.log("[send-verification-email] Processing:", { email, type, newEmail });

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client for generating verification token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const baseUrl = Deno.env.get("SITE_URL") || "https://wgohndthjgeqamfuldov.lovableproject.com";
    
    let subject: string;
    let htmlContent: string;

    if (type === "signup") {
      // Generate magic link for email verification
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
        options: {
          redirectTo: `${baseUrl}/auth?verified=true`,
        }
      });

      if (linkError) {
        console.error("[send-verification-email] Error generating link:", linkError);
        // For signup, we just send a welcome message since Supabase handles verification
        subject = "Welcome to Print Power Purpose!";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #2563eb; font-size: 28px; margin: 0 0 8px 0;">🐾 Welcome to Print Power Purpose!</h1>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Hi${firstName ? ` ${firstName}` : ''},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Thank you for creating an account with Print Power Purpose! Your account has been created successfully.
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  You can now sign in and start exploring our products. Every purchase you make supports a nonprofit of your choice!
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${baseUrl}/auth" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Sign In Now
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                  Print Power Purpose - Print with Purpose 🐾
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
      } else {
        const verificationLink = linkData?.properties?.action_link || `${baseUrl}/auth`;
        subject = "Verify Your Email - Print Power Purpose";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #2563eb; font-size: 28px; margin: 0 0 8px 0;">🐾 Verify Your Email</h1>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Hi${firstName ? ` ${firstName}` : ''},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Thank you for signing up with Print Power Purpose! Please verify your email address by clicking the button below:
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${verificationLink}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Verify Email Address
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                  This link will expire in 24 hours. If you didn't create an account with Print Power Purpose, you can safely ignore this email.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                
                <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                  Print Power Purpose - Print with Purpose 🐾
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
      }
    } else if (type === "email_change" && newEmail) {
      // For email change, send verification to the new email
      subject = "Verify Your New Email Address - Print Power Purpose";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #2563eb; font-size: 28px; margin: 0 0 8px 0;">🐾 Verify Your New Email</h1>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hi${firstName ? ` ${firstName}` : ''},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                You requested to change your email address to <strong>${newEmail}</strong>. A verification link has been sent to your new email address.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Please check your inbox at <strong>${newEmail}</strong> and click the verification link to confirm this change.
              </p>
              
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  ⚠️ If you didn't request this change, please secure your account immediately by changing your password.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
                Print Power Purpose - Print with Purpose 🐾
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid verification type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Print Power Purpose <onboarding@resend.dev>",
      to: [type === "email_change" && newEmail ? email : email], // Send notification to current email
      subject: subject,
      html: htmlContent,
    });

    console.log("[send-verification-email] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-verification-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send verification email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
