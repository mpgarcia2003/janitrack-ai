import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isCheckingTenant, setIsCheckingTenant] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          setIsAuthenticated(true);
          
          // Check if user has tenant_id
          // If not, redirect to TenantSignup (unless already there)
          const currentPath = window.location.pathname.toLowerCase();
          const isTenantSignupPage = currentPath.includes('tenantsignup');
          
          if (!user.tenant_id && !isTenantSignupPage) {
            console.log('User has no tenant_id, redirecting to TenantSignup...');
            window.location.href = '/TenantSignup';
            return;
          }
          
          setIsCheckingTenant(false);
        } else {
          // Not authenticated - redirect to login
          base44.auth.redirectToLogin(window.location.href);
        }
      } catch (error) {
        // Not authenticated - redirect to login
        base44.auth.redirectToLogin(window.location.href);
      }
    };

    checkAuth();
  }, []);

  // Show loading while checking authentication and tenant
  if (isAuthenticated === null || isCheckingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // User is authenticated and has tenant (or is on TenantSignup page), render the page
  return <>{children}</>;
}