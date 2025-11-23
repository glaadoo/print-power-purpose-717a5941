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
        console.log("[AdminProtectedRoute] No passcode found - redirecting to home");
        
        // Log failed attempt (no passcode provided)
        try {
          await supabase.functions.invoke('verify-admin-passcode', {
            body: { 
              passcode: '', 
              path: location.pathname
            }
          });
        } catch (err) {
          console.error("[AdminProtectedRoute] Failed to log access attempt:", err);
        }
        
        setIsChecking(false);
        return;
      }

      try {
        // Verify passcode and log access attempt
        console.log("[AdminProtectedRoute] Calling verify-admin-passcode edge function");
        const { data, error } = await supabase.functions.invoke('verify-admin-passcode', {
          body: { 
            passcode: passcodeToVerify, 
            path: location.pathname
          }
        });

        console.log("[AdminProtectedRoute] Edge function response:", { data, error });

        if (!error && data?.valid) {
          console.log("[AdminProtectedRoute] Access granted - logged to admin_access_logs");
          // Store passcode for subsequent admin page visits
          sessionStorage.setItem("admin_passcode", passcodeToVerify);
          setIsAuthorized(true);
        } else {
          console.log("[AdminProtectedRoute] Access denied:", { error, data });
          sessionStorage.removeItem("admin_passcode");
        }
      } catch (err) {
        console.error("[AdminProtectedRoute] Verification error:", err);
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

  // Redirect if not authorized
  if (!isAuthorized) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Render admin page if authorized
  return children;
}
