import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      // Handle rate limiting errors specifically
      if (error.message.includes("rate") || error.status === 429) {
        toast.error("Please wait 60 seconds before requesting another reset email.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Password reset email sent! Check your inbox and spam folder.");
      setTimeout(() => {
        navigate("/auth?mode=signin");
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <button
          onClick={() => navigate("/auth?mode=signin")}
          className="size-9 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 grid place-items-center transition-colors"
          aria-label="Back to sign in"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <span className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          Reset Password
        </span>
        
        <div className="w-9" />
      </header>

      <div className="scroll-smooth">
        <section className="relative min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-md mx-auto">
            <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Forgot Your Password?</h2>
                <p className="text-white/80 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your.email@example.com"
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate("/auth?mode=signin")}
                    className="text-white/80 hover:text-white text-sm underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
