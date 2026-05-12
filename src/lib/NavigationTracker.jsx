import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { trackEvent } from "@/lib/analytics";

const ROUTE_TO_PAGE = {
  "/": "Home",
  "/Home": "Home",
  "/Dashboard": "Dashboard",
  "/Clients": "Clients",
  "/Areas": "Areas",
  "/Feedback": "Feedback",
  "/Inventory": "Inventory",
  "/InventoryReports": "InventoryReports",
  "/Projects": "Projects",
  "/Reports": "Reports",
  "/Settings": "Settings",
  "/Billing": "Billing",
  "/SuperAdmin": "SuperAdmin",
  "/TenantSignup": "TenantSignup",
  "/ScanCheckIn": "ScanCheckIn",
  "/FeedbackQR": "FeedbackQR",
  "/NewProjectQR": "NewProjectQR",
  "/InventoryAccess": "InventoryAccess",
};

function resolvePageName(pathname) {
  if (!pathname) return null;
  const exact = ROUTE_TO_PAGE[pathname];
  if (exact) return exact;
  const lower = pathname.toLowerCase();
  const match = Object.entries(ROUTE_TO_PAGE).find(([key]) => key.toLowerCase() === lower);
  return match ? match[1] : null;
}

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Notify parent frame (used by base44's editor preview)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.parent?.postMessage({ type: "app_changed_url", url: window.location.href }, "*");
  }, [location]);

  // Log activity + emit pageview event
  useEffect(() => {
    const pageName = resolvePageName(location.pathname);
    if (!pageName) return;

    trackEvent("page_view", { page: pageName, pathname: location.pathname });

    if (isAuthenticated && base44?.appLogs?.logUserInApp) {
      base44.appLogs.logUserInApp(pageName).catch(() => {
        // Logging is best-effort; never break navigation on a logger failure.
      });
    }
  }, [location, isAuthenticated]);

  return null;
}
