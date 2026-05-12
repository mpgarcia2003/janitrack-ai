import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

function LoadingScreen({ label = "Loading…" }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" aria-hidden="true" />
        <p className="text-slate-600">{label}</p>
      </div>
    </div>
  );
}

/**
 * Gate that requires an authenticated session. If not, redirect to /Login
 * and remember the requested URL so we can come back after sign-in.
 */
export function RequireAuth({ children }) {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();
  if (isLoadingAuth) return <LoadingScreen label="Checking your session…" />;
  if (!isAuthenticated) {
    return <Navigate to="/Login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

/**
 * Gate that requires the authenticated user to have a tenant. If not, send
 * them to /TenantSignup so they can create one.
 */
export function RequireTenant({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const onTenantSignup = location.pathname.toLowerCase().startsWith("/tenantsignup");

  if (!user) return <LoadingScreen label="Loading account…" />;
  if (!user.tenant_id && !onTenantSignup) {
    return <Navigate to="/TenantSignup" replace />;
  }
  return children;
}

export function PublicRoute({ children }) {
  return children;
}
