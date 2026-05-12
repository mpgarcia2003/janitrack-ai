import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

const ROUTES = [
  "Home",
  "Login",
  "Signup",
  "Dashboard",
  "Clients",
  "Areas",
  "Feedback",
  "Inventory",
  "InventoryReports",
  "Projects",
  "Reports",
  "Settings",
  "Billing",
  "SuperAdmin",
  "TenantSignup",
  "ScanCheckIn",
  "FeedbackQR",
  "NewProjectQR",
  "InventoryAccess",
];

function resolvePageName(pathname) {
  if (!pathname || pathname === "/") return "Home";
  const lower = pathname.toLowerCase().replace(/^\//, "").split("/")[0];
  return ROUTES.find((name) => name.toLowerCase() === lower) ?? null;
}

export default function NavigationTracker() {
  const location = useLocation();
  useEffect(() => {
    const pageName = resolvePageName(location.pathname);
    if (!pageName) return;
    trackEvent("page_view", { page: pageName, pathname: location.pathname });
  }, [location]);
  return null;
}
