import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, TrendingUp, BarChart3, Activity, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, differenceInMinutes } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import EventsTable from "@/components/reports/EventsTable";
import ActivityChart from "@/components/reports/ActivityChart";
import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";
import { reportError } from "@/lib/error-reporting";
import { toast } from "@/lib/toast";

export default function Reports() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [timeRange, setTimeRange] = useState("7days");
  const [selectedClient, setSelectedClient] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ["cleaning-events-report", tenantId],
    queryFn: () =>
      tenantId
        ? base44.entities.CleaningEvent.filter({ tenant_id: tenantId }, "-created_date", 500)
        : Promise.resolve([]),
    enabled: !!tenantId,
  });
  const clientsQuery = useQuery({
    queryKey: ["clients", tenantId],
    queryFn: () =>
      tenantId ? base44.entities.Client.filter({ tenant_id: tenantId }) : Promise.resolve([]),
    enabled: !!tenantId,
  });
  const areasQuery = useQuery({
    queryKey: ["areas", tenantId],
    queryFn: () =>
      tenantId ? base44.entities.Area.filter({ tenant_id: tenantId }) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const cleaningEvents = eventsQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const areas = areasQuery.data ?? [];

  const anyError = eventsQuery.error ?? clientsQuery.error ?? areasQuery.error;
  if (anyError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-7xl mx-auto">
        <QueryErrorState
          error={anyError}
          onRetry={() => {
            eventsQuery.refetch();
            clientsQuery.refetch();
            areasQuery.refetch();
          }}
        />
      </div>
    );
  }

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "24h":
        return { start: subDays(now, 1), end: now };
      case "30days":
        return { start: subDays(now, 30), end: now };
      case "90days":
        return { start: subDays(now, 90), end: now };
      case "7days":
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const dateRange = getDateRange();
  const filteredEvents = cleaningEvents.filter((e) => {
    const eventDate = new Date(e.created_date);
    const inRange = eventDate >= dateRange.start && eventDate <= dateRange.end;
    const matchesClient = selectedClient === "all" || e.client_id === selectedClient;
    return inRange && matchesClient;
  });

  const filteredAreas =
    selectedClient === "all" ? areas : areas.filter((a) => a.client_id === selectedClient);

  const areaFrequencyStats = filteredAreas.map((area) => {
    const areaEvents = filteredEvents.filter((e) => e.area_id === area.id);
    const eventCount = areaEvents.length;

    let onTimeCount = 0;
    let lateCount = 0;
    if (area.cadence_minutes && area.last_cleaned_at) {
      const minutesSince = differenceInMinutes(new Date(), new Date(area.last_cleaned_at));
      if (minutesSince <= area.cadence_minutes) onTimeCount = 1;
      else lateCount = 1;
    }

    let avgMinutesBetween = null;
    if (areaEvents.length > 1) {
      const sorted = [...areaEvents].sort(
        (a, b) => new Date(a.created_date) - new Date(b.created_date)
      );
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        total += differenceInMinutes(new Date(sorted[i].created_date), new Date(sorted[i - 1].created_date));
      }
      avgMinutesBetween = Math.round(total / (sorted.length - 1));
    }

    const complianceRate =
      eventCount > 0 && area.cadence_minutes
        ? Math.round((onTimeCount / Math.max(1, onTimeCount + lateCount)) * 100)
        : null;

    return { ...area, eventCount, avgMinutesBetween, complianceRate, isOverdue: lateCount > 0 };
  });

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["Date", "Time", "Area", "Client", "Cleaner", "Status", "Notes", "Has Photo", "Has GPS"];
      const rows = filteredEvents.map((e) => {
        const area = areas.find((a) => a.id === e.area_id);
        const client = clients.find((c) => c.id === e.client_id);
        return [
          format(new Date(e.created_date), "yyyy-MM-dd"),
          format(new Date(e.created_date), "HH:mm:ss"),
          area?.name ?? "Unknown",
          client?.name ?? "Unknown",
          e.cleaner_name,
          e.status,
          e.notes?.replace(/,/g, ";") ?? "",
          e.photo_url ? "Yes" : "No",
          e.latitude ? "Yes" : "No",
        ];
      });
      const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
      downloadCSV(csv, `cleaning-events-${format(new Date(), "yyyy-MM-dd")}.csv`);
    } catch (error) {
      reportError(error, { where: "Reports.exportToCSV" });
      toast.error("Failed to export events CSV");
    }
    setIsExporting(false);
  };

  const exportAreaFrequency = () => {
    setIsExporting(true);
    try {
      const headers = [
        "Client",
        "Area",
        "Risk Level",
        "Required Cadence (min)",
        "Cleanings in Period",
        "Avg Minutes Between",
        "Last Cleaned",
        "Minutes Since Last",
        "Status",
        "Compliance %",
      ];
      const rows = areaFrequencyStats.map((area) => {
        const client = clients.find((c) => c.id === area.client_id);
        const minutesSince = area.last_cleaned_at
          ? differenceInMinutes(new Date(), new Date(area.last_cleaned_at))
          : null;
        const status = area.isOverdue
          ? "Overdue"
          : area.cadence_minutes && minutesSince && minutesSince > area.cadence_minutes * 0.8
          ? "Due Soon"
          : "On Schedule";
        return [
          client?.name ?? "Unknown",
          area.name,
          area.risk_level,
          area.cadence_minutes ?? "Not Set",
          area.eventCount,
          area.avgMinutesBetween ?? "N/A",
          area.last_cleaned_at ? format(new Date(area.last_cleaned_at), "yyyy-MM-dd HH:mm") : "Never",
          minutesSince ?? "N/A",
          status,
          area.complianceRate !== null ? `${area.complianceRate}%` : "N/A",
        ];
      });
      const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
      downloadCSV(csv, `area-frequency-${format(new Date(), "yyyy-MM-dd")}.csv`);
    } catch (error) {
      reportError(error, { where: "Reports.exportAreaFrequency" });
      toast.error("Failed to export frequency CSV");
    }
    setIsExporting(false);
  };

  const getAreaName = (id) => areas.find((a) => a.id === id)?.name ?? "Unknown";
  const getClientName = (id) => clients.find((c) => c.id === id)?.name ?? "Unknown";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Cleaning activity and compliance reports</p>
        </div>

        <Card className="shadow-md mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="report-range">
                  Time Range
                </label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger id="report-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block" htmlFor="report-client">
                  Client Filter
                </label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="report-client">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="events">Cleaning Events</TabsTrigger>
            <TabsTrigger value="frequency">Area Frequency</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={exportToCSV}
                disabled={isExporting || filteredEvents.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-5 h-5 mr-2" aria-hidden="true" />
                Export Events CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard label="Total Events" value={filteredEvents.length} Icon={Activity} accent="text-emerald-500" />
              <SummaryCard
                label="With Photos"
                value={filteredEvents.filter((e) => e.photo_url).length}
                Icon={TrendingUp}
                accent="text-emerald-500"
              />
              <SummaryCard
                label="With GPS"
                value={filteredEvents.filter((e) => e.latitude).length}
                Icon={BarChart3}
                accent="text-purple-500"
              />
              <SummaryCard
                label="Unique Cleaners"
                value={new Set(filteredEvents.map((e) => e.cleaner_name)).size}
                Icon={Calendar}
                accent="text-orange-500"
              />
            </div>

            <ActivityChart events={filteredEvents} />
            <EventsTable
              events={filteredEvents}
              getAreaName={getAreaName}
              getClientName={getClientName}
              isLoading={eventsQuery.isLoading}
            />
          </TabsContent>

          <TabsContent value="frequency" className="space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={exportAreaFrequency}
                disabled={isExporting || areaFrequencyStats.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-5 h-5 mr-2" aria-hidden="true" />
                Export Frequency CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard label="Total Areas" value={filteredAreas.length} Icon={MapPin} accent="text-emerald-500" />
              <SummaryCard
                label="Overdue Areas"
                value={areaFrequencyStats.filter((a) => a.isOverdue).length}
                Icon={Activity}
                accent="text-red-500"
              />
              <SummaryCard
                label="Avg Compliance"
                value={`${Math.round(
                  (areaFrequencyStats.filter((a) => a.complianceRate !== null).reduce((sum, a) => sum + a.complianceRate, 0) /
                    Math.max(1, areaFrequencyStats.filter((a) => a.complianceRate !== null).length)) || 0
                )}%`}
                Icon={TrendingUp}
                accent="text-emerald-500"
              />
              <SummaryCard
                label="Trouble Areas"
                value={filteredAreas.filter((a) => a.risk_level === "trouble").length}
                Icon={BarChart3}
                accent="text-orange-500"
              />
            </div>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Area Cleaning Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead className="text-right">Required Cadence</TableHead>
                        <TableHead className="text-right">Cleanings</TableHead>
                        <TableHead className="text-right">Avg Between</TableHead>
                        <TableHead>Last Cleaned</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {areaFrequencyStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            No areas found
                          </TableCell>
                        </TableRow>
                      ) : (
                        areaFrequencyStats.map((area) => {
                          const minutesSince = area.last_cleaned_at
                            ? differenceInMinutes(new Date(), new Date(area.last_cleaned_at))
                            : null;
                          const status = area.isOverdue
                            ? "overdue"
                            : area.cadence_minutes && minutesSince && minutesSince > area.cadence_minutes * 0.8
                            ? "due-soon"
                            : "on-schedule";

                          return (
                            <TableRow key={area.id}>
                              <TableCell className="font-medium">{area.name}</TableCell>
                              <TableCell>{getClientName(area.client_id)}</TableCell>
                              <TableCell>
                                <Badge variant={area.risk_level === "trouble" ? "destructive" : "secondary"}>
                                  {area.risk_level}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {area.cadence_minutes ? `${Math.round(area.cadence_minutes / 60)}h` : "Not Set"}
                              </TableCell>
                              <TableCell className="text-right font-semibold">{area.eventCount}</TableCell>
                              <TableCell className="text-right">
                                {area.avgMinutesBetween ? `${Math.round(area.avgMinutesBetween / 60)}h` : "N/A"}
                              </TableCell>
                              <TableCell>
                                {area.last_cleaned_at ? (
                                  <div>
                                    <div className="font-medium">
                                      {format(new Date(area.last_cleaned_at), "MMM d, h:mm a")}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ({Math.round(minutesSince / 60)}h ago)
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Never</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    status === "overdue"
                                      ? "destructive"
                                      : status === "due-soon"
                                      ? "secondary"
                                      : "default"
                                  }
                                  className={
                                    status === "on-schedule"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : status === "due-soon"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : ""
                                  }
                                >
                                  {status === "overdue"
                                    ? "Overdue"
                                    : status === "due-soon"
                                    ? "Due Soon"
                                    : "On Schedule"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, Icon, accent }) {
  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <Icon className={`w-10 h-10 ${accent}`} aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
