import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import GlassCard from "@/components/GlassCard";

export default function AdminSettings() {
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdatePasscode = async () => {
    if (!currentPasscode || !newPasscode || !confirmPasscode) {
      toast.error("All fields are required");
      return;
    }

    if (newPasscode !== confirmPasscode) {
      toast.error("New passcode and confirmation do not match");
      return;
    }

    if (newPasscode.length < 8) {
      toast.error("New passcode must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-admin-passcode', {
        body: {
          currentPasscode,
          newPasscode
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Passcode validation successful");
        toast.info(data.instructions, { duration: 10000 });
        
        // Clear form
        setCurrentPasscode("");
        setNewPasscode("");
        setConfirmPasscode("");
      } else {
        toast.error(data.error || "Failed to update passcode");
      }
    } catch (error: any) {
      console.error("Passcode update error:", error);
      toast.error(error.message || "Failed to update passcode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <VideoBackground
        srcMp4="/media/hero.mp4"
        srcWebm="/media/hero.webm"
        poster="/media/hero-poster.jpg"
        overlay={<div className="absolute inset-0 bg-black/60" />}
      />

      <div className="relative z-10 min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link to="/admin">
              <Button variant="ghost" className="mb-4 text-white hover:bg-white/10">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Settings</h1>
            <p className="text-white/70">Manage your admin security settings</p>
          </div>

          {/* Settings Card */}
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/20 rounded-full">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Change Admin Passcode</h2>
                <p className="text-white/70 text-sm">Update your admin access passcode</p>
              </div>
            </div>

            {/* Warning notice */}
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/90">
                <p className="font-semibold mb-1">Important Security Notice</p>
                <p>After updating your passcode, you will need to manually update the <code className="bg-black/20 px-1 rounded">ADMIN_PASSCODE</code> secret in your Supabase project settings for the change to take effect.</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="current" className="text-white mb-2 block">
                  Current Passcode
                </Label>
                <Input
                  id="current"
                  type="password"
                  value={currentPasscode}
                  onChange={(e) => setCurrentPasscode(e.target.value)}
                  placeholder="Enter current passcode"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <div>
                <Label htmlFor="new" className="text-white mb-2 block">
                  New Passcode
                </Label>
                <Input
                  id="new"
                  type="password"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="Enter new passcode (min 8 characters)"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <div>
                <Label htmlFor="confirm" className="text-white mb-2 block">
                  Confirm New Passcode
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Confirm new passcode"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <Button
                onClick={handleUpdatePasscode}
                disabled={loading}
                className="w-full rounded-full"
                size="lg"
              >
                {loading ? "Updating..." : "Update Passcode"}
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
