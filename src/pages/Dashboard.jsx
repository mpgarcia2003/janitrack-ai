import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  QrCode,
  Package,
  FolderKanban,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Activity,
  Rocket
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, isAfter, isBefore, differenceInMinutes } from "date-fns";

import StatsCard from "../components/dashboard/StatsCard";
import RecentEvents from "../components/dashboard/RecentEvents";
import TroubleAreas from "../components/dashboard/TroubleAreas";
import InventoryAlerts from "../components/dashboard/InventoryAlerts";
import AuthGuard from "../components/AuthGuard";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY RETURNS OR CONDITIONS
  const { data: cleaningEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['cleaning-events', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.CleaningEvent.filter({ tenant_id: user.tenant_id }, '-created_date', 100)
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ['areas', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.Area.filter({ tenant_id: user.tenant_id })
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.Client.filter({ tenant_id: user.tenant_id })
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.InventoryItem.filter({ tenant_id: user.tenant_id })
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.Project.filter({ tenant_id: user.tenant_id }, '-created_date')
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  // Check user and redirect if needed - AFTER all hooks
  useEffect(() => {
    base44.auth.me().then(u => {
      console.log('Dashboard - User loaded:', u);
      console.log('Dashboard - tenant_id:', u?.tenant_id);
      console.log('Dashboard - user_role:', u?.user_role);
      setUser(u);
    }).catch(() => {});
  }, []);

  // Show setup prompt if no tenant_id - AFTER all hooks
  if (user && !user.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="text-center text-2xl">Setup Required</CardTitle>
          </CardHeader>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Welcome to JaniTrackAI!
            </h3>
            <p className="text-gray-600">
              Before you can start, please complete your company setup.
            </p>
            
            {/* Debug Info */}
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-left text-xs">
              <p><strong>Debug Info:</strong></p>
              <p>Email: {user.email}</p>
              <p>Tenant ID: {user.tenant_id || 'NOT SET'}</p>
              <p>Role: {user.user_role || user.role || 'NOT SET'}</p>
            </div>

            <Button
              onClick={() => window.location.href = '/TenantSignup'}
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
            >
              Complete Setup Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enrich events with area and client names
  const enrichedEvents = cleaningEvents.map(event => {
    const area = areas.find(a => a.id === event.area_id);
    const client = clients.find(c => c.id === event.client_id);
    return {
      ...event,
      area_name: area?.name,
      client_name: client?.name
    };
  });

  // Calculate stats
  const last24hEvents = enrichedEvents.filter(e =>
    isAfter(new Date(e.created_date), subDays(new Date(), 1))
  );

  const troubleAreas = areas.filter(a => a.risk_level === 'trouble' || a.complaint_count > 2);

  const lowInventory = inventory.filter(i =>
    i.reorder_point && i.on_hand <= i.reorder_point
  );

  const overdueProjects = projects.filter(p =>
    p.due_date && isBefore(new Date(p.due_date), new Date()) && p.status !== 'completed'
  );

  const onTimePercentage = areas.length > 0
    ? Math.round((areas.filter(a => {
        if (!a.last_cleaned_at || !a.cadence_minutes) return true;
        const minutesSince = differenceInMinutes(new Date(), new Date(a.last_cleaned_at));
        return minutesSince <= a.cadence_minutes;
      }).length / areas.length) * 100)
    : 100;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {user?.full_name || 'User'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <StatsCard
              title="Cleanings (24h)"
              value={last24hEvents.length}
              icon={CheckCircle2}
              bgColor="from-blue-500 to-blue-600"
              trend={`${onTimePercentage}% on-time`}
              trendUp={onTimePercentage >= 90}
            />
            <StatsCard
              title="Trouble Areas"
              value={troubleAreas.length}
              icon={AlertTriangle}
              bgColor="from-orange-500 to-red-600"
              trend={troubleAreas.length > 0 ? 'Needs attention' : 'All clear'}
              trendUp={troubleAreas.length === 0}
            />
            <StatsCard
              title="Low Stock Items"
              value={lowInventory.length}
              icon={Package}
              bgColor="from-purple-500 to-purple-600"
              trend={lowInventory.length > 0 ? 'Reorder needed' : 'Stock healthy'}
              trendUp={lowInventory.length === 0}
            />
            <StatsCard
              title="Active Projects"
              value={projects.filter(p => ['open', 'in_progress'].includes(p.status)).length}
              icon={FolderKanban}
              bgColor="from-green-500 to-green-600"
              trend={`${overdueProjects.length} overdue`}
              trendUp={overdueProjects.length === 0}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Events - Takes 2 columns */}
            <div className="lg:col-span-2">
              <RecentEvents
                events={last24hEvents}
                isLoading={eventsLoading || areasLoading || clientsLoading}
              />
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              <TroubleAreas areas={troubleAreas} isLoading={areasLoading} />
              <InventoryAlerts items={lowInventory} isLoading={inventoryLoading} />
            </div>
          </div>

          {/* Quick Actions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to={createPageUrl("ScanCheckIn")}>
                  <Button className="w-full h-20 bg-blue-600 hover:bg-blue-700 flex flex-col gap-2">
                    <QrCode className="w-6 h-6" />
                    <span className="text-sm">Scan QR</span>
                  </Button>
                </Link>
                <Link to={createPageUrl("Inventory")}>
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Package className="w-6 h-6" />
                    <span className="text-sm">Inventory</span>
                  </Button>
                </Link>
                <Link to={createPageUrl("Projects")}>
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <FolderKanban className="w-6 h-6" />
                    <span className="text-sm">Projects</span>
                  </Button>
                </Link>
                <Link to={createPageUrl("Reports")}>
                  <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                    <Activity className="w-6 h-6" />
                    <span className="text-sm">Reports</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}