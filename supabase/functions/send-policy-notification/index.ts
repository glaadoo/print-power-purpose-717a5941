import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PolicyNotificationRequest {
  policyType: string;
  policyTitle: string;
  version: number;
  effectiveDate: string;
  changelog?: string;
  notifyAdmins?: boolean;
  notifyUsers?: boolean;
}

// Admin email template
const getAdminEmailHtml = (
  policyTitle: string,
  policyType: string,
  version: string,
  effectiveDate: string,
  changelog: string | undefined,
  adminUrl: string
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #000; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Policy Version Published</h1>
    </div>
    
    <div style="padding: 40px;">
      <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
        A new version of <strong>${policyTitle}</strong> has been published.
      </p>
      
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 8px 0; color: #374151; font-size: 14px;">
          <strong>Document Type:</strong> ${policyType === 'privacy' ? 'Privacy Policy' : policyType === 'terms' ? 'Terms of Use' : 'Legal Notice'}
        </p>
        <p style="margin: 8px 0; color: #374151; font-size: 14px;">
          <strong>Version:</strong> v${version}
        </p>
        <p style="margin: 8px 0; color: #374151; font-size: 14px;">
          <strong>Effective Date:</strong> ${effectiveDate}
        </p>
        ${changelog ? `<p style="margin: 8px 0; color: #374151; font-size: 14px;"><strong>Changes:</strong> ${changelog}</p>` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="display: inline-block; background-color: #000; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          View in Admin Panel
        </a>
      </div>
    </div>
    
    <div style="background-color: #f6f9fc; padding: 20px; text-align: center;">
      <p style="color: #8898aa; font-size: 12px; margin: 0;">
        Print Power Purpose Admin System
      </p>
    </div>
  </div>
</body>
</html>
`;

// User email template
const getUserEmailHtml = (
  policyTitle: string,
  version: string,
  effectiveDate: string,
  changelog: string | undefined,
  policyUrl: string
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #000; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Policy Update Notice</h1>
    </div>
    
    <div style="padding: 40px;">
      <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
        We've updated our <strong>${policyTitle}</strong> to better serve you and keep you informed about how we protect your information.
      </p>
      
      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 8px 0; color: #92400e; font-size: 15px;">
          <strong>What's Changed:</strong>
        </p>
        <p style="margin: 8px 0; color: #92400e; font-size: 15px;">
          ${changelog || "We've made updates to improve clarity and transparency."}
        </p>
      </div>
      
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 6px 0; color: #374151; font-size: 14px;">
          <strong>Version:</strong> v${version}
        </p>
        <p style="margin: 6px 0; color: #374151; font-size: 14px;">
          <strong>Effective Date:</strong> ${effectiveDate}
        </p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 20px 0;">
        By continuing to use Print Power Purpose, you acknowledge and accept these updates.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${policyUrl}" style="display: inline-block; background-color: #000; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Read Full Policy
        </a>
      </div>
      
      <p style="font-size: 14px; line-height: 1.5; color: #6b7280; margin: 24px 0 0;">
        If you have any questions about these changes, please don't hesitate to 
        <a href="https://printpowerpurpose.com/contact" style="color: #2754C5; text-decoration: underline;">contact us</a>.
      </p>
    </div>
    
    <div style="background-color: #f6f9fc; padding: 20px; text-align: center;">
      <p style="color: #8898aa; font-size: 12px; margin: 0; line-height: 1.6;">
        © ${new Date().getFullYear()} Print Power Purpose. All rights reserved.<br>
        This is an important notification about our legal policies.
      </p>
    </div>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      policyType,
      policyTitle,
      version,
      effectiveDate,
      changelog,
      notifyAdmins = true,
      notifyUsers = true,
    }: PolicyNotificationRequest = await req.json();

    console.log("Sending policy notifications:", { policyType, version, notifyAdmins, notifyUsers });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const baseUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
    const policyUrl = `${baseUrl}/policies/${policyType}?version=${version}`;
    const adminUrl = `${baseUrl}/admin/legal`;

    const results = {
      adminEmails: [] as any[],
      userEmails: [] as any[],
      errors: [] as any[],
    };

    // Send notifications to admins
    if (notifyAdmins) {
      try {
        const { data: admins, error: adminsError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminsError) throw adminsError;

        if (admins && admins.length > 0) {
          const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
          if (usersError) throw usersError;

          const adminEmails = users
            .filter(user => admins.some(admin => admin.user_id === user.id))
            .map(user => user.email)
            .filter((email): email is string => typeof email === 'string');

          for (const email of adminEmails) {
            try {
              const html = getAdminEmailHtml(
                policyTitle,
                policyType,
                version.toString(),
                effectiveDate,
                changelog,
                adminUrl
              );

              const { data, error } = await resend.emails.send({
                from: "Print Power Purpose <onboarding@resend.dev>",
                to: [email],
                subject: `New ${policyTitle} Version Published (v${version})`,
                html,
              });

              if (error) {
                console.error("Failed to send admin email:", error);
                results.errors.push({ email, error: error.message });
              } else {
                results.adminEmails.push({ email, id: data?.id });
              }
            } catch (error: any) {
              console.error("Error sending to admin:", error);
              results.errors.push({ email, error: error.message });
            }
          }
        }
      } catch (error: any) {
        console.error("Error fetching admins:", error);
        results.errors.push({ context: "admin_fetch", error: error.message });
      }
    }

    // Send notifications to users
    if (notifyUsers) {
      try {
        const { data: legalLogs, error: logsError } = await supabase
          .from("legal_logs")
          .select("user_id")
          .eq("policy_type", policyType)
          .not("user_id", "is", null)
          .order("accepted_at", { ascending: false });

        if (logsError) throw logsError;

        if (legalLogs && legalLogs.length > 0) {
          const uniqueUserIds = [...new Set(legalLogs.map(log => log.user_id))];
          const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
          if (usersError) throw usersError;

          const userEmails = users
            .filter(user => uniqueUserIds.includes(user.id))
            .map(user => user.email)
            .filter((email): email is string => typeof email === 'string');

          const emailsToSend = userEmails.slice(0, 100);

          for (const email of emailsToSend) {
            try {
              const html = getUserEmailHtml(
                policyTitle,
                version.toString(),
                effectiveDate,
                changelog,
                policyUrl
              );

              const { data, error } = await resend.emails.send({
                from: "Print Power Purpose <onboarding@resend.dev>",
                to: [email],
                subject: `Important Update: ${policyTitle}`,
                html,
              });

              if (error) {
                console.error("Failed to send user email:", error);
                results.errors.push({ email, error: error.message });
              } else {
                results.userEmails.push({ email, id: data?.id });
              }
            } catch (error: any) {
              console.error("Error sending to user:", error);
              results.errors.push({ email, error: error.message });
            }
          }

          console.log(`Sent ${results.userEmails.length} user notifications out of ${userEmails.length} total users`);
        }
      } catch (error: any) {
        console.error("Error fetching users:", error);
        results.errors.push({ context: "user_fetch", error: error.message });
      }
    }

    console.log("Notification results:", {
      adminsSent: results.adminEmails.length,
      usersSent: results.userEmails.length,
      errors: results.errors.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        adminEmailsSent: results.adminEmails.length,
        userEmailsSent: results.userEmails.length,
        errors: results.errors,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-policy-notification function:", error);
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