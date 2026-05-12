import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

function LoadingScreen({ label = "Loading…" }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-slate-600">{label}</p>
      </div>
    </div>
  );
}

/**
 * Gate that requires the user to be authenticated. If not, kick off the SDK
 * login redirect. While the check is in flight, render a spinner.
 */
export function RequireAuth({ children }) {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingScreen label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    navigateToLogin();
    return <LoadingScreen label="Redirecting to login…" />;
  }

  return children;
}

/**
 * Gate that requires the authenticated user to belong to a tenant. If they
 * don't, redirect to /TenantSignup so they can finish onboarding. Pages mounted
 * underneath this guard can safely assume `user.tenant_id` is set.
 */
export function RequireTenant({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  const onTenantSignup = path.startsWith("/tenantsignup");

  if (!user) {
    return <LoadingScreen label="Loading account…" />;
  }

  if (!user.tenant_id && !onTenantSignup) {
    return <Navigate to="/TenantSignup" replace />;
  }

  return children;
}

/**
 * Public route — always renders children, no auth check.
 */
export function PublicRoute({ children }) {
  return children;
}
