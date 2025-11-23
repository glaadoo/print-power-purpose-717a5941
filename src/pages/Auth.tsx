import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";
import { Session } from "@supabase/supabase-js";
import { z } from "zod";

// Password validation schema with strong security requirements
const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// HaveIBeenPwned k-anonymity check
async function checkPasswordBreached(password: string): Promise<boolean> {
  try {
    // Hash password with SHA-1
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Send only first 5 chars for k-anonymity
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) return false; // Fail open if API unavailable
    
    const text = await response.text();
    const hashes = text.split('\n');
    
    // Check if our hash suffix appears in the response
    return hashes.some(line => line.startsWith(suffix));
  } catch (error) {
    console.error('HIBP check failed:', error);
    return false; // Fail open on error
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate("/welcome");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate("/welcome");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );

      const signInPromise = supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      const { error } = await Promise.race([signInPromise, timeoutPromise]) as any;

      if (error) {
        setLoading(false);
        
        // Check for network/connection errors
        if (error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('Failed to fetch')) {
          toast.error("Cannot connect to authentication service. Please check your internet connection and try again.");
          return;
        }
        
        // Check if the error is related to invalid credentials
        if (error.message.toLowerCase().includes('invalid') || 
            error.message.toLowerCase().includes('credentials')) {
          
          // Check if user exists by calling our edge function
          try {
            const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-user-exists', {
              body: { email: signInEmail }
            });

            if (checkError) {
              toast.error("An error occurred. Please try again.");
            } else if (checkResult?.exists) {
              toast.error("Incorrect password. Please try again.");
            } else {
              toast.error("Account does not exist. Please sign up first.");
            }
          } catch (err) {
            toast.error("An error occurred. Please try again.");
          }
        } else {
          toast.error(error.message);
        }
      } else {
        // Set access flag for authenticated user
        localStorage.setItem("ppp_access", "user");
        toast.success("Signed in successfully!");
      }
    } catch (err: any) {
      setLoading(false);
      
      if (err.message === 'Connection timeout') {
        toast.error("Connection timeout. The authentication service is not responding. Please try again later.");
      } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error("Unable to sign in. Please try again.");
      }
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password strength
      const passwordValidation = passwordSchema.safeParse(signUpData.password);
      if (!passwordValidation.success) {
        const errors = passwordValidation.error.errors.map(err => err.message);
        toast.error(errors[0]); // Show first validation error
        setLoading(false);
        return;
      }

      // Check if password has been breached (HaveIBeenPwned k-anonymity)
      toast.info("Checking password security...");
      const isBreached = await checkPasswordBreached(signUpData.password);
      if (isBreached) {
        toast.error("This password has appeared in data breaches. Please choose a different password.");
        setLoading(false);
        return;
      }

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );

      const signUpPromise = supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/welcome`,
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            phone: signUpData.phone,
            street_address: signUpData.streetAddress,
            city: signUpData.city,
            state: signUpData.state,
            zip_code: signUpData.zipCode,
            country: signUpData.country,
          }
        }
      });

      const { error } = await Promise.race([signUpPromise, timeoutPromise]) as any;

      if (error) {
        // Check for network/connection errors
        if (error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('Failed to fetch')) {
          toast.error("Cannot connect to authentication service. Please check your internet connection and try again.");
        } else {
          toast.error(error.message);
        }
      } else {
        // Set access flag for authenticated user
        localStorage.setItem("ppp_access", "user");
        toast.success("Account created! You can now sign in.");
        setMode("signin");
        setSignInEmail(signUpData.email);
      }
    } catch (error: any) {
      if (error.message === 'Connection timeout') {
        toast.error("Connection timeout. The authentication service is not responding. Please try again later.");
      } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error("An error occurred during signup. Please try again.");
      }
    }
    
    setLoading(false);
  };

  if (session) {
    return null;
  }

  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a
          href="/"
          className="size-9 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 grid place-items-center transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        
        <span className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase">
          Sign In
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
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-full border border-white/30 bg-white/10 backdrop-blur p-1">
                <button
                  onClick={() => setMode("signin")}
                  className={`px-6 py-2 rounded-full font-semibold transition-all ${
                    mode === "signin"
                      ? "bg-white text-black"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`px-6 py-2 rounded-full font-semibold transition-all ${
                    mode === "signup"
                      ? "bg-white text-black"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-8">
              {mode === "signin" ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-white">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-white/90"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                  <div className="text-center">
                    <a
                      href="/forgot-password"
                      className="text-white/80 hover:text-white text-sm underline"
                    >
                      Forgot Password?
                    </a>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-white">First Name</Label>
                      <Input
                        id="firstName"
                        value={signUpData.firstName}
                        onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                        required
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-white">Last Name</Label>
                      <Input
                        id="lastName"
                        value={signUpData.lastName}
                        onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                        required
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-white">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-white">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        required
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={signUpData.phone}
                      onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="streetAddress" className="text-white">Street Address</Label>
                    <Input
                      id="streetAddress"
                      value={signUpData.streetAddress}
                      onChange={(e) => setSignUpData({ ...signUpData, streetAddress: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-white">City</Label>
                      <Input
                        id="city"
                        value={signUpData.city}
                        onChange={(e) => setSignUpData({ ...signUpData, city: e.target.value })}
                        required
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-white">State</Label>
                      <Input
                        id="state"
                        value={signUpData.state}
                        onChange={(e) => setSignUpData({ ...signUpData, state: e.target.value })}
                        required
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-white">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={signUpData.zipCode}
                      onChange={(e) => setSignUpData({ ...signUpData, zipCode: e.target.value })}
                      required
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-white/90"
                  >
                    {loading ? "Creating Account..." : "Sign Up"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
