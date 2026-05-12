import "./App.css";
import React from "react";
import { Toaster as ToasterSonner } from "@/components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import NavigationTracker from "@/lib/NavigationTracker";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { RequireAuth, RequireTenant } from "@/components/RouteGuards";
import Layout from "@/Layout";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
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

import ScanCheckIn from "@/pages/ScanCheckIn";
import FeedbackQR from "@/pages/FeedbackQR";
import NewProjectQR from "@/pages/NewProjectQR";
import InventoryAccess from "@/pages/InventoryAccess";

function RootRoute() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  if (isLoadingAuth) return <Home />;
  if (isAuthenticated) return <Navigate to="/Dashboard" replace state={{ from: location }} />;
  return <Home />;
}

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
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/Home" element={<Home />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Signup" element={<Signup />} />

      {/* Public QR flows */}
      <Route path="/ScanCheckIn" element={<ScanCheckIn />} />
      <Route path="/FeedbackQR" element={<FeedbackQR />} />
      <Route path="/NewProjectQR" element={<NewProjectQR />} />
      <Route path="/InventoryAccess" element={<InventoryAccess />} />

      {/* Onboarding */}
      <Route
        path="/TenantSignup"
        element={
          <RequireAuth>
            <TenantSignup />
          </RequireAuth>
        }
      />

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
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
