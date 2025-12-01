import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, ShieldCheck, ShieldOff, Loader2, QrCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export default function TwoFactorAuth() {
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      // Filter to only show verified TOTP factors
      const verifiedFactors = data?.totp?.filter(f => f.status === 'verified') || [];
      setFactors(verifiedFactors);
    } catch (error: any) {
      console.error("Error loading MFA factors:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    try {
      setEnrolling(true);
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });
      
      if (error) throw error;
      
      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setShowEnrollDialog(true);
      }
    } catch (error: any) {
      console.error("Error starting MFA enrollment:", error);
      toast.error(error.message || "Failed to start 2FA setup");
    } finally {
      setEnrolling(false);
    }
  };

  const verifyEnrollment = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    try {
      setVerifying(true);
      
      // Create a challenge for the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId
      });
      
      if (challengeError) throw challengeError;
      
      // Verify the challenge with the TOTP code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });
      
      if (verifyError) throw verifyError;
      
      toast.success("Two-factor authentication enabled successfully!");
      setShowEnrollDialog(false);
      setVerificationCode("");
      setQrCode("");
      setSecret("");
      setFactorId("");
      loadFactors();
    } catch (error: any) {
      console.error("Error verifying MFA:", error);
      toast.error(error.message || "Invalid verification code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const disableTwoFactor = async () => {
    if (factors.length === 0) return;
    
    try {
      setDisabling(true);
      
      // Unenroll the factor
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factors[0].id
      });
      
      if (error) throw error;
      
      toast.success("Two-factor authentication disabled");
      setShowDisableDialog(false);
      setDisableCode("");
      loadFactors();
    } catch (error: any) {
      console.error("Error disabling MFA:", error);
      toast.error(error.message || "Failed to disable 2FA");
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const cancelEnrollment = async () => {
    // If we have a factorId but haven't verified, unenroll the pending factor
    if (factorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    setShowEnrollDialog(false);
    setVerificationCode("");
    setQrCode("");
    setSecret("");
    setFactorId("");
  };

  const is2FAEnabled = factors.length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by requiring a verification code from your authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {is2FAEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">2FA is enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is protected with an authenticator app
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setShowDisableDialog(true)}
                className="w-full sm:w-auto"
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Shield className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">2FA is not enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Enable 2FA to protect your account from unauthorized access
                  </p>
                </div>
              </div>
              <Button 
                onClick={startEnrollment} 
                disabled={enrolling}
                className="w-full sm:w-auto"
              >
                {enrolling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={(open) => !open && cancelEnrollment()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Set Up Authenticator App
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {qrCode && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Can't scan? Enter this code manually:
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                  {secret}
                </code>
                <Button variant="outline" size="icon" onClick={copySecret}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="verification-code">Enter verification code</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={cancelEnrollment} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={verifyEnrollment} 
                disabled={verifying || verificationCode.length !== 6}
                className="flex-1"
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Verify & Enable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="h-5 w-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disable 2FA? This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDisableDialog(false)} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={disableTwoFactor}
              disabled={disabling}
              className="flex-1"
            >
              {disabling ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Disable 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
