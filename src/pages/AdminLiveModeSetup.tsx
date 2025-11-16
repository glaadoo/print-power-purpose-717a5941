import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CredentialStatus {
  name: string;
  configured: boolean;
  description: string;
  required: boolean;
}

interface CredentialCheckResponse {
  credentials: CredentialStatus[];
  summary: {
    totalRequired: number;
    configuredRequired: number;
    allRequiredConfigured: boolean;
    readyForProduction: boolean;
  };
}

const AdminLiveModeSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<CredentialCheckResponse | null>(null);

  const checkCredentials = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-live-credentials");
      
      if (error) throw error;
      
      setCredentialStatus(data);
      
      toast({
        title: "Credentials Checked",
        description: `${data.summary.configuredRequired} of ${data.summary.totalRequired} required credentials configured`,
      });
    } catch (error) {
      console.error("Error checking credentials:", error);
      toast({
        title: "Check Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkCredentials();
  }, []);

  const getInstructions = (credentialName: string): string => {
    const instructions: Record<string, string> = {
      SINALITE_CLIENT_ID_LIVE: "Contact SinaLite support to obtain your production OAuth Client ID",
      SINALITE_CLIENT_SECRET_LIVE: "Contact SinaLite support to obtain your production OAuth Client Secret",
      SINALITE_AUTH_URL_LIVE: "Production auth URL: https://auth.sinalite.com/oauth/token (verify with SinaLite)",
      SINALITE_API_URL_LIVE: "Production API URL: https://api.sinalite.com/v1/products (verify with SinaLite)",
      SINALITE_AUDIENCE_LIVE: "Production audience: https://api.sinalite.com (verify with SinaLite)",
      STRIPE_SECRET_KEY_LIVE: "Get from Stripe Dashboard → Developers → API Keys (starts with sk_live_)",
      STRIPE_WEBHOOK_SECRET: "Get from Stripe Dashboard → Developers → Webhooks after creating endpoint",
    };
    return instructions[credentialName] || "Contact the service provider for production credentials";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Live Mode Setup Checklist</h1>
          <p className="text-muted-foreground">Configure production credentials before going live</p>
        </div>
      </div>

      {credentialStatus && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Production Readiness Status</CardTitle>
              <CardDescription>
                Configure all required credentials to enable Live Mode
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Required Credentials</p>
                  <p className="text-2xl font-bold">
                    {credentialStatus.summary.configuredRequired} / {credentialStatus.summary.totalRequired}
                  </p>
                </div>
                {credentialStatus.summary.readyForProduction ? (
                  <Badge className="text-lg py-2 px-4" variant="default">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Ready for Production
                  </Badge>
                ) : (
                  <Badge className="text-lg py-2 px-4" variant="destructive">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Configuration Incomplete
                  </Badge>
                )}
              </div>

              <Button
                onClick={checkCredentials}
                disabled={checking}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
                Recheck Credentials
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SinaLite Production Credentials</CardTitle>
              <CardDescription>
                Required for processing orders through SinaLite's production environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {credentialStatus.credentials
                .filter(c => c.name.startsWith("SINALITE"))
                .map((credential) => (
                  <div
                    key={credential.name}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    {credential.configured ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono">{credential.name}</code>
                        <Badge variant={credential.configured ? "default" : "destructive"}>
                          {credential.configured ? "Configured" : "Missing"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{credential.description}</p>
                      {!credential.configured && (
                        <Alert>
                          <AlertDescription className="text-xs">
                            📋 {getInstructions(credential.name)}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stripe Production Credentials</CardTitle>
              <CardDescription>
                Required for processing payments through Stripe's production environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {credentialStatus.credentials
                .filter(c => c.name.startsWith("STRIPE"))
                .map((credential) => (
                  <div
                    key={credential.name}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    {credential.configured ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : credential.required ? (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono">{credential.name}</code>
                        <Badge
                          variant={
                            credential.configured
                              ? "default"
                              : credential.required
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {credential.configured
                            ? "Configured"
                            : credential.required
                            ? "Missing"
                            : "Optional"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{credential.description}</p>
                      {!credential.configured && (
                        <Alert>
                          <AlertDescription className="text-xs">
                            📋 {getInstructions(credential.name)}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ))}
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open("https://dashboard.stripe.com/apikeys", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3 list-decimal list-inside">
                <li className="text-sm">
                  Configure all missing credentials above through Backend → Secrets
                </li>
                <li className="text-sm">
                  Test your production credentials using the diagnostic tools
                </li>
                <li className="text-sm">
                  Verify SinaLite production API access by syncing products
                </li>
                <li className="text-sm">
                  Once all credentials are configured, use the Stripe Mode Toggle to switch to Live Mode
                </li>
                <li className="text-sm">
                  Process a test order to verify end-to-end production functionality
                </li>
              </ol>

              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/admin")}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Admin
                </Button>
                {credentialStatus.summary.readyForProduction && (
                  <Button
                    onClick={() => navigate("/admin")}
                    className="flex-1"
                  >
                    Go to Stripe Mode Toggle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminLiveModeSetup;
