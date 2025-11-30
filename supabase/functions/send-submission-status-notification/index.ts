import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  recipientEmail: string;
  nonprofitName: string;
  status: "approved" | "rejected";
  adminNotes?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  console.log(`[send-submission-status-notification] Sending email to: ${to}`);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "Print Power Purpose <noreply@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[send-submission-status-notification] Resend API error: ${response.status} - ${errorText}`);
    throw new Error(`Resend API error: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`[send-submission-status-notification] Email sent successfully:`, result);
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, nonprofitName, status, adminNotes }: NotificationRequest = await req.json();

    console.log(`[send-submission-status-notification] Processing notification for: ${nonprofitName} - Status: ${status}`);

    if (!recipientEmail) {
      console.log("[send-submission-status-notification] No recipient email provided, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No recipient email, notification skipped" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isApproved = status === "approved";
    const subject = isApproved 
      ? `Great News! "${nonprofitName}" Has Been Approved`
      : `Update on Your Nonprofit Submission: "${nonprofitName}"`;

    const approvedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #10b981, #059669); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px;">✓</span>
              </div>
              <h1 style="color: #10b981; font-size: 24px; margin: 0;">Nonprofit Approved!</h1>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Great news! Your nonprofit submission has been reviewed and approved.
            </p>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Approved Organization</h3>
              <p style="color: #15803d; font-size: 18px; font-weight: 600; margin: 0;">${nonprofitName}</p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              <strong>${nonprofitName}</strong> is now available in our nonprofit directory. Users can select it when making purchases to support your cause!
            </p>
            
            ${adminNotes ? `
              <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">Note from our team:</p>
                <p style="color: #374151; font-size: 14px; margin: 0;">${adminNotes}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="https://printpowerpurpose.com/select/nonprofit" 
                 style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                View in Directory
              </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              Thank you for helping expand our network of causes!<br>
              — The Print Power Purpose Team
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const rejectedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: linear-gradient(135deg, #f59e0b, #d97706); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px;">!</span>
              </div>
              <h1 style="color: #d97706; font-size: 24px; margin: 0;">Submission Update</h1>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Thank you for submitting a nonprofit to Print Power Purpose. After review, we were unable to approve this submission at this time.
            </p>
            
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted Organization</h3>
              <p style="color: #b45309; font-size: 18px; font-weight: 600; margin: 0;">${nonprofitName}</p>
            </div>
            
            ${adminNotes ? `
              <div style="background: #f9fafb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0; font-weight: 600;">Reason / Notes:</p>
                <p style="color: #374151; font-size: 14px; margin: 0;">${adminNotes}</p>
              </div>
            ` : ''}
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Common reasons for rejection include:
            </p>
            <ul style="color: #6b7280; font-size: 14px; line-height: 1.8;">
              <li>Organization already exists in our directory</li>
              <li>Unable to verify nonprofit status</li>
              <li>Incomplete or incorrect information</li>
              <li>Organization doesn't meet our guidelines</li>
            </ul>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              If you believe this was an error or have additional information to provide, please feel free to submit again with updated details.
            </p>
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="https://printpowerpurpose.com/select/nonprofit" 
                 style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Browse Existing Nonprofits
              </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              Thank you for your interest in supporting causes!<br>
              — The Print Power Purpose Team
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(recipientEmail, subject, isApproved ? approvedHtml : rejectedHtml);

    return new Response(
      JSON.stringify({ success: true, message: `${status} notification sent to ${recipientEmail}` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[send-submission-status-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
