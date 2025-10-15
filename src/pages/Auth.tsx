import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import VideoBackground from "@/components/VideoBackground";

export default function Auth() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [loading, setLoading] = useState(false);

  // Sign in form
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign up form
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
    document.title = "Sign Up / Sign In - Print Power Purpose";

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in successfully!");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
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

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! You can now sign in.");
      setMode("signin");
      setSignInEmail(signUpData.email);
      setSignUpData({
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
    }
    setLoading(false);
  };

  if (session) {
    return null;
  }

  return (
    <div className="fixed inset-0 text-white">
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-6 py-3 flex items-center justify-center text-white backdrop-blur bg-black/20 border-b border-white/10">
        <a
          href="/"
          className="tracking-[0.2em] text-sm md:text-base font-semibold uppercase"
          aria-label="Print Power Purpose Home"
        >
          PRINT&nbsp;POWER&nbsp;PURPOSE
        </a>
      </header>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto scroll-smooth pt-16">
        <section className="relative min-h-screen flex items-center justify-center py-12 px-4">
          <VideoBackground
            srcMp4="/media/hero.mp4"
            srcWebm="/media/hero.webm"
            poster="/media/hero-poster.jpg"
            overlay={<div className="absolute inset-0 bg-black/50" />}
          />

          <div className="relative w-full max-w-4xl mx-auto">
            {/* Toggle buttons */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-full border border-white/30 bg-white/10 backdrop-blur p-1">
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
              </div>
            </div>

            {/* Sign Up Form */}
            {mode === "signup" && (
              <form
                onSubmit={handleSignUp}
                className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8"
              >
                <h2 className="text-3xl font-serif font-semibold text-center mb-6">
                  Create Your Account
                </h2>
                <p className="text-center opacity-90 mb-8">
                  Join Print Power Purpose and start making an impact with every order
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account Information */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold mb-4 opacity-90">Account Information</h3>
                  </div>

                  <FormField
                    label="Email *"
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                    colSpan
                  />

                  <FormField
                    label="Password *"
                    type="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    colSpan
                  />

                  {/* Personal Information */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold mb-4 opacity-90">Personal Information</h3>
                  </div>

                  <FormField
                    label="First Name *"
                    value={signUpData.firstName}
                    onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                    placeholder="John"
                    required
                  />

                  <FormField
                    label="Last Name *"
                    value={signUpData.lastName}
                    onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                  />

                  <FormField
                    label="Phone Number"
                    type="tel"
                    value={signUpData.phone}
                    onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />

                  {/* Shipping Address */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold mb-4 opacity-90">Shipping Address</h3>
                  </div>

                  <FormField
                    label="Street Address *"
                    value={signUpData.streetAddress}
                    onChange={(e) => setSignUpData({ ...signUpData, streetAddress: e.target.value })}
                    placeholder="123 Main St, Apt 4B"
                    required
                    colSpan
                  />

                  <FormField
                    label="City *"
                    value={signUpData.city}
                    onChange={(e) => setSignUpData({ ...signUpData, city: e.target.value })}
                    placeholder="New York"
                    required
                  />

                  <FormField
                    label="State *"
                    value={signUpData.state}
                    onChange={(e) => setSignUpData({ ...signUpData, state: e.target.value })}
                    placeholder="NY"
                    required
                  />

                  <FormField
                    label="ZIP Code *"
                    value={signUpData.zipCode}
                    onChange={(e) => setSignUpData({ ...signUpData, zipCode: e.target.value })}
                    placeholder="10001"
                    required
                  />

                  <FormField
                    label="Country *"
                    value={signUpData.country}
                    onChange={(e) => setSignUpData({ ...signUpData, country: e.target.value })}
                    placeholder="United States"
                    required
                  />
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full px-8 py-3 bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>
                </div>

                <p className="mt-6 text-center text-sm opacity-70">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="underline font-semibold"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            )}

            {/* Sign In Form */}
            {mode === "signin" && (
              <form
                onSubmit={handleSignIn}
                className="rounded-3xl border border-white/30 bg-white/10 backdrop-blur shadow-2xl p-6 md:p-8 max-w-md mx-auto"
              >
                <h2 className="text-3xl font-serif font-semibold text-center mb-6">
                  Welcome Back
                </h2>
                <p className="text-center opacity-90 mb-8">
                  Sign in to continue your impact journey
                </p>

                <div className="space-y-4">
                  <FormField
                    label="Email"
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />

                  <FormField
                    label="Password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full px-8 py-3 bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </button>
                </div>

                <p className="mt-6 text-center text-sm opacity-70">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="underline font-semibold"
                  >
                    Sign Up
                  </button>
                </p>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Form field component
function FormField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  minLength,
  colSpan = false,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? "md:col-span-2" : ""}>
      <label className="text-sm opacity-90 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl bg-white/90 text-black px-3 py-2 outline-none focus:ring-2 focus:ring-white/40"
      />
    </div>
  );
}
