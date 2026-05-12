import React from "react";
import { entities } from "@/lib/db";
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
  CheckCircle2,
  Activity,
} from "lucide-react";
import { subDays, isAfter, isBefore, differenceInMinutes } from "date-fns";

import StatsCard from "@/components/dashboard/StatsCard";
import RecentEvents from "@/components/dashboard/RecentEvents";
import TroubleAreas from "@/components/dashboard/TroubleAreas";
import InventoryAlerts from "@/components/dashboard/InventoryAlerts";
import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const eventsQuery = useQuery({
    queryKey: ["cleaning-events", tenantId],
    queryFn: () => entities.CleaningEvent.filter({ tenant_id: tenantId }, "-created_at", 100),
    enabled: !!tenantId,
  });

  const areasQuery = useQuery({
    queryKey: ["areas", tenantId],
    queryFn: () => entities.Area.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", tenantId],
    queryFn: () => entities.Client.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  const inventoryQuery = useQuery({
    queryKey: ["inventory", tenantId],
    queryFn: () => entities.InventoryItem.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects", tenantId],
    queryFn: () => entities.Project.filter({ tenant_id: tenantId }, "-created_at"),
    enabled: !!tenantId,
  });

  const cleaningEvents = eventsQuery.data ?? [];
  const areas = areasQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  const enrichedEvents = cleaningEvents.map((event) => ({
    ...event,
    area_name: areas.find((a) => a.id === event.area_id)?.name,
    client_name: clients.find((c) => c.id === event.client_id)?.name,
  }));

  const last24hEvents = enrichedEvents.filter((e) =>
    isAfter(new Date(e.created_at), subDays(new Date(), 1))
  );
  const troubleAreas = areas.filter((a) => a.risk_level === "trouble" || a.complaint_count > 2);
  const lowInventory = inventory.filter((i) => i.reorder_point && i.on_hand <= i.reorder_point);
  const overdueProjects = projects.filter(
    (p) => p.due_date && isBefore(new Date(p.due_date), new Date()) && p.status !== "completed"
  );

  const onTimePercentage =
    areas.length > 0
      ? Math.round(
          (areas.filter((a) => {
            if (!a.last_cleaned_at || !a.cadence_minutes) return true;
            const minutesSince = differenceInMinutes(new Date(), new Date(a.last_cleaned_at));
            return minutesSince <= a.cadence_minutes;
          }).length /
            areas.length) *
            100
        )
      : 100;

  const anyError =
    eventsQuery.error ?? areasQuery.error ?? clientsQuery.error ?? inventoryQuery.error ?? projectsQuery.error;
  if (anyError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-5xl mx-auto">
        <QueryErrorState
          title="Couldn't load the dashboard"
          error={anyError}
          onRetry={() => {
            eventsQuery.refetch();
            areasQuery.refetch();
            clientsQuery.refetch();
            inventoryQuery.refetch();
            projectsQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.full_name ?? "there"}.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatsCard
            title="Cleanings (24h)"
            value={last24hEvents.length}
            icon={CheckCircle2}
            bgColor="from-emerald-500 to-emerald-600"
            trend={`${onTimePercentage}% on-time`}
            trendUp={onTimePercentage >= 90}
          />
          <StatsCard
            title="Trouble Areas"
            value={troubleAreas.length}
            icon={AlertTriangle}
            bgColor="from-orange-500 to-red-600"
            trend={troubleAreas.length > 0 ? "Needs attention" : "All clear"}
            trendUp={troubleAreas.length === 0}
          />
          <StatsCard
            title="Low Stock Items"
            value={lowInventory.length}
            icon={Package}
            bgColor="from-purple-500 to-purple-600"
            trend={lowInventory.length > 0 ? "Reorder needed" : "Stock healthy"}
            trendUp={lowInventory.length === 0}
          />
          <StatsCard
            title="Active Projects"
            value={projects.filter((p) => ["open", "in_progress"].includes(p.status)).length}
            icon={FolderKanban}
            bgColor="from-emerald-500 to-emerald-700"
            trend={`${overdueProjects.length} overdue`}
            trendUp={overdueProjects.length === 0}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentEvents
              events={last24hEvents}
              isLoading={eventsQuery.isLoading || areasQuery.isLoading || clientsQuery.isLoading}
            />
          </div>
          <div className="space-y-6">
            <TroubleAreas areas={troubleAreas} isLoading={areasQuery.isLoading} />
            <InventoryAlerts items={lowInventory} isLoading={inventoryQuery.isLoading} />
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to={createPageUrl("Areas")} aria-label="Areas and QR codes">
                <Button className="w-full h-20 bg-emerald-600 hover:bg-emerald-700 flex flex-col gap-2">
                  <QrCode className="w-6 h-6" aria-hidden="true" />
                  <span className="text-sm">Areas & QR</span>
                </Button>
              </Link>
              <Link to={createPageUrl("Inventory")} aria-label="Inventory">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Package className="w-6 h-6" aria-hidden="true" />
                  <span className="text-sm">Inventory</span>
                </Button>
              </Link>
              <Link to={createPageUrl("Projects")} aria-label="Projects">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <FolderKanban className="w-6 h-6" aria-hidden="true" />
                  <span className="text-sm">Projects</span>
                </Button>
              </Link>
              <Link to={createPageUrl("Reports")} aria-label="Reports">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Activity className="w-6 h-6" aria-hidden="true" />
                  <span className="text-sm">Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
