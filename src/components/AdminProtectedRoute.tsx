// ADMIN SECURITY CORE
// DO NOT REMOVE OR BYPASS
// This component enforces admin passcode verification before accessing admin pages.

import { ReactElement, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminProtectedRouteProps {
  children: ReactElement;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Check URL for passcode
      const params = new URLSearchParams(window.location.search);
      const passcode = params.get('key');
      
      // Check sessionStorage for stored passcode
      const storedPasscode = sessionStorage.getItem("admin_passcode");
      
      const passcodeToVerify = passcode || storedPasscode;

      console.log("[AdminProtectedRoute] Checking access:", {
        urlPasscode: passcode ? "present" : "missing",
        storedPasscode: storedPasscode ? "present" : "missing",
        passcodeToVerify: passcodeToVerify ? "present" : "missing",
        path: location.pathname
      });

      if (!passcodeToVerify) {
        console.log("[AdminProtectedRoute] No passcode found");
        setErrorMessage("No admin passcode provided. Please use /admin?key=YOUR_PASSCODE");
        setIsChecking(false);
        return;
      }

      try {
        // Verify passcode with timeout
        console.log("[AdminProtectedRoute] Calling verify-admin-passcode edge function");
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        // Race between function call and timeout
        const result = await Promise.race([
          supabase.functions.invoke('verify-admin-passcode', {
            body: { 
              passcode: passcodeToVerify, 
              path: location.pathname
            }
          }),
          timeoutPromise
        ]) as any;

        console.log("[AdminProtectedRoute] Edge function response:", result);

        if (!result.error && result.data?.valid) {
          console.log("[AdminProtectedRoute] Access granted");
          sessionStorage.setItem("admin_passcode", passcodeToVerify);
          // Store session token for subsequent admin API calls
          if (result.data.sessionToken) {
            sessionStorage.setItem("admin_session", result.data.sessionToken);
          }
          setIsAuthorized(true);
          setErrorMessage(null);
        } else {
          console.log("[AdminProtectedRoute] Access denied:", result);
          sessionStorage.removeItem("admin_passcode");
          setErrorMessage(result.error?.message || "Invalid admin passcode");
        }
      } catch (err: any) {
        console.error("[AdminProtectedRoute] Verification error:", err);
        
        if (err.message === 'Timeout') {
          console.error("[AdminProtectedRoute] Request timed out - edge function not responding");
          setErrorMessage("Admin verification timed out. The backend may be experiencing issues. Please try again in a moment.");
        } else if (err.message === 'Failed to fetch') {
          setErrorMessage("Cannot connect to admin verification service. The backend appears to be offline. Please check your connection or try again later.");
        } else {
          setErrorMessage(`Verification failed: ${err.message}`);
        }
        
        sessionStorage.removeItem("admin_passcode");
      }

      setIsChecking(false);
    };

    checkAdminAccess();
  }, [location.pathname]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show error message if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center max-w-md px-6">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4">Admin Access Denied</h1>
          <p className="text-white/70 mb-6">{errorMessage || "You don't have permission to access this page."}</p>
          <button
            onClick={() => window.location.href = "/"}
            className="px-6 py-3 bg-white text-black rounded-full hover:bg-white/90 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Render admin page if authorized
  return children;
}
