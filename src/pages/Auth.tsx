import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, CalendarIcon } from "lucide-react";
import VideoBackground from "@/components/VideoBackground";
import { Session } from "@supabase/supabase-js";
import { z } from "zod";
import Footer from "@/components/Footer";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  console.log('[Auth] Component rendering');
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
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  console.log('[Auth] State initialized');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        localStorage.setItem("ppp_access", "user");
        navigate("/welcome");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        localStorage.setItem("ppp_access", "user");
        navigate("/welcome");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/welcome`,
        }
      });
      
      if (error) {
        toast.error(error.message);
      }
    } catch (error: any) {
      toast.error(`Failed to sign in with ${provider}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

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
            birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
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
        // Send welcome/verification email
        try {
          await supabase.functions.invoke('send-verification-email', {
            body: { 
              email: signUpData.email, 
              type: 'signup',
              firstName: signUpData.firstName 
            }
          });
        } catch (emailError) {
          console.log('[Auth] Verification email send failed:', emailError);
        }
        
        // Show verification message
        setVerificationEmail(signUpData.email);
        setShowVerificationMessage(true);
        localStorage.setItem("ppp_access", "user");
        toast.success("Account created! Please check your email.");
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

  // Show verification message after signup
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen bg-gray-50 relative z-10">
        <header className="sticky top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between bg-white border-b border-gray-200 shadow-sm">
          <button
            onClick={() => navigate("/")}
            className="size-9 rounded-full border border-gray-300 bg-white hover:bg-gray-50 grid place-items-center transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          
          <span className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase text-blue-600">
            Email Verification
          </span>
          
          <div className="w-9" />
        </header>

        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
              
              <p className="text-gray-600 mb-6">
                We've sent a welcome email to <strong className="text-gray-900">{verificationEmail}</strong>.
              </p>
              
              <p className="text-sm text-gray-500 mb-8">
                Your account has been created successfully. You can now sign in with your credentials.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setShowVerificationMessage(false);
                    setMode("signin");
                    setSignInEmail(verificationEmail);
                  }}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  Continue to Sign In
                </Button>
                
                <Button
                  variant="outline"
                  onClick={async () => {
                    toast.info("Resending welcome email...");
                    try {
                      await supabase.functions.invoke('send-verification-email', {
                        body: { 
                          email: verificationEmail, 
                          type: 'signup',
                          firstName: signUpData.firstName 
                        }
                      });
                      toast.success("Welcome email resent!");
                    } catch (error) {
                      toast.error("Failed to resend email. Please try again.");
                    }
                  }}
                  className="w-full"
                >
                  Resend Email
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  console.log('[Auth] Rendering return JSX');
  
  return (
    <div className="min-h-screen bg-gray-50 relative z-10">
      <header className="sticky top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between bg-white border-b border-gray-200 shadow-sm">
        <button
          onClick={() => navigate("/")}
          className="size-9 rounded-full border border-gray-300 bg-white hover:bg-gray-50 grid place-items-center transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        
        <span className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase text-blue-600">
          Sign In
        </span>
        
        <div className="w-9" />
      </header>

      <div className="scroll-smooth">
        <section className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md mx-auto z-20">
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-full border border-gray-300 bg-white shadow-sm p-1">
                <button
                  onClick={() => setMode("signin")}
                  className={`px-6 py-2 rounded-full font-semibold transition-all ${
                    mode === "signin"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`px-6 py-2 rounded-full font-semibold transition-all ${
                    mode === "signup"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
              {mode === "signin" ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-700">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-gray-700">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                  <div className="text-center">
                    <a
                      href="/forgot-password"
                      className="text-blue-600 hover:text-blue-700 text-sm underline"
                    >
                      Forgot Password?
                    </a>
                  </div>

                  {/* Social Login Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">or continue with</span>
                    </div>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialSignIn('google')}
                      disabled={loading}
                      className="w-full border-gray-300 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 mr-1.5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Google</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialSignIn('facebook')}
                      disabled={loading}
                      className="w-full border-gray-300 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span className="hidden sm:inline">Facebook</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialSignIn('twitter')}
                      disabled={loading}
                      className="w-full border-gray-300 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span className="hidden sm:inline">X</span>
                    </Button>
                  </div>

                  {/* Continue as Guest Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  {/* Continue as Guest Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      localStorage.setItem("ppp_access", "guest");
                      navigate("/welcome");
                    }}
                    className="w-full border-gray-300 hover:bg-gray-50 text-gray-700"
                  >
                    Continue as Guest
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-700">First Name</Label>
                      <Input
                        id="firstName"
                        value={signUpData.firstName}
                        onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                        required
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-700">Last Name</Label>
                      <Input
                        id="lastName"
                        value={signUpData.lastName}
                        onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                        required
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-700">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-700">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        required
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Birth Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white border-gray-300",
                            !birthDate && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {birthDate ? format(birthDate, "PPP") : "Select your birth date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={birthDate}
                          onSelect={setBirthDate}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={signUpData.phone}
                      onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="streetAddress" className="text-gray-700">Street Address</Label>
                    <Input
                      id="streetAddress"
                      value={signUpData.streetAddress}
                      onChange={(e) => setSignUpData({ ...signUpData, streetAddress: e.target.value })}
                      required
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-700">City</Label>
                      <Input
                        id="city"
                        value={signUpData.city}
                        onChange={(e) => setSignUpData({ ...signUpData, city: e.target.value })}
                        required
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-gray-700">State</Label>
                      <Input
                        id="state"
                        value={signUpData.state}
                        onChange={(e) => setSignUpData({ ...signUpData, state: e.target.value })}
                        required
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-700">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={signUpData.zipCode}
                      onChange={(e) => setSignUpData({ ...signUpData, zipCode: e.target.value })}
                      required
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading ? "Creating Account..." : "Sign Up"}
                  </Button>

                  {/* Continue as Guest Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  {/* Continue as Guest Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      localStorage.setItem("ppp_access", "guest");
                      navigate("/welcome");
                    }}
                    className="w-full border-gray-300 hover:bg-gray-50 text-gray-700"
                  >
                    Continue as Guest
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
