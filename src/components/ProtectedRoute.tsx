import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactElement;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  // Check if user has completed onboarding (either as guest or authenticated user)
  const hasAccess = typeof window !== "undefined" 
    ? localStorage.getItem("ppp_access") 
    : null;

  if (!hasAccess) {
    // Redirect to home if user hasn't gone through onboarding
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
