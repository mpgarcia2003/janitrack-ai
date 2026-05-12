import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

export default function Feedback() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const [timeRange, setTimeRange] = useState("30days");
  const [selectedClient, setSelectedClient] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const feedbackQuery = useQuery({
    queryKey: ["feedbacks", tenantId],
    queryFn: () =>
      tenantId
        ? base44.entities.Feedback.filter({ tenant_id: tenantId }, "-feedback_timestamp", 500)
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

  if (feedbackQuery.error ?? clientsQuery.error ?? areasQuery.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-7xl mx-auto">
        <QueryErrorState
          error={feedbackQuery.error ?? clientsQuery.error ?? areasQuery.error}
          onRetry={() => {
            feedbackQuery.refetch();
            clientsQuery.refetch();
            areasQuery.refetch();
          }}
        />
      </div>
    );
  }

  const feedbacks = feedbackQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const areas = areasQuery.data ?? [];

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "7days":
        return { start: subDays(now, 7), end: now };
      case "90days":
        return { start: subDays(now, 90), end: now };
      case "30days":
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const dateRange = getDateRange();
  const filtered = feedbacks.filter((f) => {
    const fDate = new Date(f.feedback_timestamp);
    const inRange = fDate >= dateRange.start && fDate <= dateRange.end;
    const matchesClient = selectedClient === "all" || f.client_id === selectedClient;
    const matchesRating = ratingFilter === "all" || f.rating === Number.parseInt(ratingFilter);
    return inRange && matchesClient && matchesRating;
  });

  const getAreaName = (id) => areas.find((a) => a.id === id)?.name ?? "Unknown";
  const getClientName = (id) => clients.find((c) => c.id === id)?.name ?? "Unknown";

  const averageRating =
    filtered.length > 0 ? (filtered.reduce((sum, f) => sum + f.rating, 0) / filtered.length).toFixed(1) : 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: filtered.filter((f) => f.rating === rating).length,
  }));

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["Date", "Time", "Client", "Area", "Rating", "Name", "Email", "Comment"];
      const rows = filtered.map((f) => [
        format(new Date(f.feedback_timestamp), "yyyy-MM-dd"),
        format(new Date(f.feedback_timestamp), "HH:mm:ss"),
        getClientName(f.client_id),
        getAreaName(f.area_id),
        f.rating,
        f.submitted_by_name ?? "",
        f.submitted_by_email ?? "",
        f.comment?.replace(/,/g, ";") ?? "",
      ]);
      const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      reportError(error, { where: "Feedback.exportToCSV" });
      toast.error("Failed to export feedback CSV");
    }
    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Feedback & Ratings</h1>
            <p className="text-gray-600">Customer satisfaction and comments</p>
          </div>
          <Button
            onClick={exportToCSV}
            disabled={isExporting || filtered.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="w-5 h-5 mr-2" aria-hidden="true" />
            Export CSV
          </Button>
        </div>

        <Card className="shadow-md mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Client Filter</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Rating Filter</label>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Feedback</p>
                  <p className="text-3xl font-bold text-gray-900">{filtered.length}</p>
                </div>
                <MessageSquare className="w-10 h-10 text-emerald-500" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-gray-900">{averageRating}</p>
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                  </div>
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-3">Rating Distribution</p>
              {ratingDistribution.map(({ rating, count }) => (
                <div key={rating} className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium w-8">{rating}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${filtered.length > 0 ? (count / filtered.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Submitted By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No feedback found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell>
                          <div className="font-medium">{format(new Date(feedback.feedback_timestamp), "MMM d, yyyy")}</div>
                          <div className="text-xs text-gray-500">{format(new Date(feedback.feedback_timestamp), "h:mm a")}</div>
                        </TableCell>
                        <TableCell className="font-medium">{getClientName(feedback.client_id)}</TableCell>
                        <TableCell>{getAreaName(feedback.area_id)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                }`}
                                aria-hidden="true"
                              />
                            ))}
                            <span className="ml-1 font-semibold">{feedback.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {feedback.comment ? (
                            <p className="text-sm text-gray-700 line-clamp-2">{feedback.comment}</p>
                          ) : (
                            <span className="text-gray-400 text-sm">No comment</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {feedback.submitted_by_name ? (
                            <div>
                              <div className="font-medium">{feedback.submitted_by_name}</div>
                              {feedback.submitted_by_email ? (
                                <div className="text-xs text-gray-500">{feedback.submitted_by_email}</div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Anonymous</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
