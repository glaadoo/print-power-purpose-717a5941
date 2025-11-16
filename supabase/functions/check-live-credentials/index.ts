import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CredentialStatus {
  name: string;
  configured: boolean;
  description: string;
  required: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CHECK-LIVE-CREDENTIALS] Starting credential check");

    // Check all required LIVE credentials
    const credentials: CredentialStatus[] = [
      {
        name: "SINALITE_CLIENT_ID_LIVE",
        configured: !!Deno.env.get("SINALITE_CLIENT_ID_LIVE"),
        description: "SinaLite Production OAuth Client ID",
        required: true,
      },
      {
        name: "SINALITE_CLIENT_SECRET_LIVE",
        configured: !!Deno.env.get("SINALITE_CLIENT_SECRET_LIVE"),
        description: "SinaLite Production OAuth Client Secret",
        required: true,
      },
      {
        name: "SINALITE_AUTH_URL_LIVE",
        configured: !!Deno.env.get("SINALITE_AUTH_URL_LIVE"),
        description: "SinaLite Production Authentication URL",
        required: true,
      },
      {
        name: "SINALITE_API_URL_LIVE",
        configured: !!Deno.env.get("SINALITE_API_URL_LIVE"),
        description: "SinaLite Production API Base URL",
        required: true,
      },
      {
        name: "SINALITE_AUDIENCE_LIVE",
        configured: !!Deno.env.get("SINALITE_AUDIENCE_LIVE"),
        description: "SinaLite Production OAuth Audience",
        required: true,
      },
      {
        name: "STRIPE_SECRET_KEY_LIVE",
        configured: !!Deno.env.get("STRIPE_SECRET_KEY_LIVE"),
        description: "Stripe Live Secret Key (starts with sk_live_)",
        required: true,
      },
      {
        name: "STRIPE_WEBHOOK_SECRET",
        configured: !!Deno.env.get("STRIPE_WEBHOOK_SECRET"),
        description: "Stripe Webhook Signing Secret",
        required: false,
      },
    ];

    const totalRequired = credentials.filter(c => c.required).length;
    const configuredRequired = credentials.filter(c => c.required && c.configured).length;
    const allRequiredConfigured = configuredRequired === totalRequired;

    console.log("[CHECK-LIVE-CREDENTIALS] Status:", {
      configuredRequired,
      totalRequired,
      allRequiredConfigured
    });

    return new Response(
      JSON.stringify({
        credentials,
        summary: {
          totalRequired,
          configuredRequired,
          allRequiredConfigured,
          readyForProduction: allRequiredConfigured,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CHECK-LIVE-CREDENTIALS] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
