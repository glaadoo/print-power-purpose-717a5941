// PPP SECURITY CORE
// DO NOT REMOVE OR BYPASS
// This ProtectedRoute enforces onboarding before accessing gated pages.
// Users must have completed onboarding (Sign In / Sign Up / Continue as Guest) before accessing protected pages.

import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactElement;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  // CLIENT-SIDE CHECK ONLY: Verify ppp_access exists
  if (typeof window === "undefined") {
    // Server-side rendering fallback
    return null;
  }

  // Check if user has completed onboarding (either as guest or authenticated user)
  const hasAccess = localStorage.getItem("ppp_access");
  
  // Allowed values: "user" or "guest"
  // Any other value or missing → redirect to Home
  if (!hasAccess || (hasAccess !== "user" && hasAccess !== "guest")) {
    console.log("[ProtectedRoute] Access denied - redirecting to Home");
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Access granted
  return children;
}
