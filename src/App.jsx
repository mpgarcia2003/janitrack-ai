import "./App.css";
import React from "react";
import { Toaster as ToasterSonner } from "@/components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import VisualEditAgent from "@/lib/VisualEditAgent";
import NavigationTracker from "@/lib/NavigationTracker";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { setupIframeMessaging } from "./lib/iframe-messaging";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ErrorBoundary from "@/components/ErrorBoundary";
import { RequireAuth, RequireTenant } from "@/components/RouteGuards";
import Layout from "@/Layout";

// Pages
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Areas from "@/pages/Areas";
import Feedback from "@/pages/Feedback";
import Inventory from "@/pages/Inventory";
import InventoryReports from "@/pages/InventoryReports";
import Projects from "@/pages/Projects";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Billing from "@/pages/Billing";
import SuperAdmin from "@/pages/SuperAdmin";
import TenantSignup from "@/pages/TenantSignup";

// Public (QR) pages
import ScanCheckIn from "@/pages/ScanCheckIn";
import FeedbackQR from "@/pages/FeedbackQR";
import NewProjectQR from "@/pages/NewProjectQR";
import InventoryAccess from "@/pages/InventoryAccess";

setupIframeMessaging();

/**
 * Root index route: send authenticated users to the Dashboard, anyone else
 * to the marketing landing page.
 */
function RootRoute() {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const location = useLocation();
  if (isLoadingPublicSettings || isLoadingAuth) {
    // Render the landing page while we figure out who the visitor is — feels faster.
    return <Home />;
  }
  if (isAuthenticated) {
    return <Navigate to="/Dashboard" replace state={{ from: location }} />;
  }
  return <Home />;
}

/**
 * Wrap an authenticated page with the global Layout + tenant requirement.
 */
function Authenticated({ children }) {
  return (
    <RequireAuth>
      <RequireTenant>
        <Layout>{children}</Layout>
      </RequireTenant>
    </RequireAuth>
  );
}

function AppShell() {
  const { authError } = useAuth();

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      {/* Root + marketing */}
      <Route path="/" element={<RootRoute />} />
      <Route path="/Home" element={<Home />} />

      {/* Public QR flows — never gated, never wrapped in Layout */}
      <Route path="/ScanCheckIn" element={<ScanCheckIn />} />
      <Route path="/FeedbackQR" element={<FeedbackQR />} />
      <Route path="/NewProjectQR" element={<NewProjectQR />} />
      <Route path="/InventoryAccess" element={<InventoryAccess />} />

      {/* Onboarding — requires auth but tolerates missing tenant_id */}
      <Route
        path="/TenantSignup"
        element={
          <RequireAuth>
            <TenantSignup />
          </RequireAuth>
        }
      />

      {/* Authenticated app */}
      <Route path="/Dashboard" element={<Authenticated><Dashboard /></Authenticated>} />
      <Route path="/Clients" element={<Authenticated><Clients /></Authenticated>} />
      <Route path="/Areas" element={<Authenticated><Areas /></Authenticated>} />
      <Route path="/Feedback" element={<Authenticated><Feedback /></Authenticated>} />
      <Route path="/Inventory" element={<Authenticated><Inventory /></Authenticated>} />
      <Route path="/InventoryReports" element={<Authenticated><InventoryReports /></Authenticated>} />
      <Route path="/Projects" element={<Authenticated><Projects /></Authenticated>} />
      <Route path="/Reports" element={<Authenticated><Reports /></Authenticated>} />
      <Route path="/Settings" element={<Authenticated><Settings /></Authenticated>} />
      <Route path="/Billing" element={<Authenticated><Billing /></Authenticated>} />
      <Route path="/SuperAdmin" element={<Authenticated><SuperAdmin /></Authenticated>} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClientInstance}>
        <BrowserRouter>
          <AuthProvider>
            <NavigationTracker />
            <AppShell />
          </AuthProvider>
        </BrowserRouter>
        <ToasterSonner />
        <VisualEditAgent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
