import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  QrCode,
  Package,
  FolderKanban,
  FileText,
  Settings,
  Star,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

const baseNav = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Clients", url: createPageUrl("Clients"), icon: Building2 },
  { title: "Areas & QR Codes", url: createPageUrl("Areas"), icon: MapPin },
  { title: "Feedback", url: createPageUrl("Feedback"), icon: FileText },
  { title: "Inventory", url: createPageUrl("Inventory"), icon: Package },
  { title: "Inventory Reports", url: createPageUrl("InventoryReports"), icon: FileText },
  { title: "Projects", url: createPageUrl("Projects"), icon: FolderKanban },
  { title: "Reports", url: createPageUrl("Reports"), icon: FileText },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [...baseNav];
  if (user?.user_role === "tenant_owner") {
    navItems.push({ title: "Billing", url: createPageUrl("Billing"), icon: Star });
  }
  if (user?.role === "admin") {
    navItems.push({ title: "Super Admin", url: createPageUrl("SuperAdmin"), icon: Settings });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900">JaniTrackAI</h2>
                <p className="text-xs text-gray-500">Smart Cleaning Management</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname.toLowerCase() === item.url.toLowerCase()
                            ? "bg-emerald-50 text-emerald-700 font-semibold"
                            : ""
                        }`}
                      >
                        <Link to={item.url} aria-label={item.title} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" aria-hidden="true" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {user ? (
              <SidebarGroup className="mt-4">
                <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">
                  Quick Info
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-3 py-2 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Role</span>
                      <span className="font-semibold text-gray-900 capitalize">
                        {user.user_role?.replace(/_/g, " ") ?? "Member"}
                      </span>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-700 font-semibold text-sm">
                  {user?.full_name?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{user?.full_name ?? "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email ?? ""}</p>
              </div>
            </div>
            <Button
              onClick={() => logout()}
              variant="outline"
              aria-label="Log out"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              Log Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" aria-label="Open navigation" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <h1 className="text-lg font-bold text-gray-900">JaniTrackAI</h1>
              </div>
              <Button
                onClick={() => logout()}
                variant="ghost"
                size="icon"
                aria-label="Log out"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
