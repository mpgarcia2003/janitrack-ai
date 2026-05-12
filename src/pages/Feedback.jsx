
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Download, User, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AuthGuard from "../components/AuthGuard";

export default function Feedback() {
  const [timeRange, setTimeRange] = useState('30days');
  const [selectedClient, setSelectedClient] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [user, setUser] = useState(null); // New state for user
  const queryClient = useQueryClient(); // New: Initialize queryClient

  useEffect(() => { // New: Fetch user on mount
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['feedbacks', user?.tenant_id], // Add tenant_id to queryKey
    queryFn: () => user?.tenant_id // Check for tenant_id before fetching
      ? base44.entities.Feedback.filter({ tenant_id: user.tenant_id }, '-feedback_timestamp', 500) // Use filter instead of list, pass tenant_id
      : Promise.resolve([]), // Return empty array if no tenant_id
    enabled: !!user?.tenant_id, // Enable query only if tenant_id exists
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.tenant_id], // Add tenant_id
    queryFn: () => user?.tenant_id
      ? base44.entities.Client.filter({ tenant_id: user.tenant_id }) // Use filter
      : Promise.resolve([]),
    enabled: !!user?.tenant_id, // Enable if tenant_id exists
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas', user?.tenant_id], // Add tenant_id
    queryFn: () => user?.tenant_id
      ? base44.entities.Area.filter({ tenant_id: user.tenant_id }) // Use filter
      : Promise.resolve([]),
    enabled: !!user?.tenant_id, // Enable if tenant_id exists
  });

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '7days':
        return { start: subDays(now, 7), end: now };
      case '30days':
        return { start: subDays(now, 30), end: now };
      case '90days':
        return { start: subDays(now, 90), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const dateRange = getDateRange();
  const filteredFeedbacks = feedbacks.filter(f => {
    const feedbackDate = new Date(f.feedback_timestamp);
    const inRange = feedbackDate >= dateRange.start && feedbackDate <= dateRange.end;
    const matchesClient = selectedClient === 'all' || f.client_id === selectedClient;
    const matchesRating = ratingFilter === 'all' || f.rating === parseInt(ratingFilter);
    return inRange && matchesClient && matchesRating;
  });

  const getAreaName = (areaId) => areas.find(a => a.id === areaId)?.name || 'Unknown';
  const getClientName = (clientId) => clients.find(c => c.id === clientId)?.name || 'Unknown';

  const averageRating = filteredFeedbacks.length > 0
    ? (filteredFeedbacks.reduce((sum, f) => sum + f.rating, 0) / filteredFeedbacks.length).toFixed(1)
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: filteredFeedbacks.filter(f => f.rating === rating).length
  }));

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        'Date',
        'Time',
        'Client',
        'Area',
        'Rating',
        'Name',
        'Email',
        'Comment'
      ];

      const rows = filteredFeedbacks.map(f => [
        format(new Date(f.feedback_timestamp), 'yyyy-MM-dd'),
        format(new Date(f.feedback_timestamp), 'HH:mm:ss'),
        getClientName(f.client_id),
        getAreaName(f.area_id),
        f.rating,
        f.submitted_by_name || '',
        f.submitted_by_email || '',
        f.comment?.replace(/,/g, ';') || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
    setIsExporting(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Feedback & Ratings
              </h1>
              <p className="text-gray-600">Customer satisfaction and comments</p>
            </div>
            <Button
              onClick={exportToCSV}
              disabled={isExporting || filteredFeedbacks.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <Card className="shadow-md mb-6">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Time Range
                  </label>
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Client Filter
                  </label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Rating Filter
                  </label>
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

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Feedback</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {filteredFeedbacks.length}
                    </p>
                  </div>
                  <MessageSquare className="w-10 h-10 text-blue-500" />
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
                      <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-gray-600 mb-3">Rating Distribution</p>
                  {ratingDistribution.map(({ rating, count }) => (
                    <div key={rating} className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium w-8">{rating}★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{
                            width: `${filteredFeedbacks.length > 0 ? (count / filteredFeedbacks.length) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feedback Table */}
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
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : filteredFeedbacks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No feedback found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFeedbacks.map(feedback => (
                        <TableRow key={feedback.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {format(new Date(feedback.feedback_timestamp), 'MMM d, yyyy')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(feedback.feedback_timestamp), 'h:mm a')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getClientName(feedback.client_id)}
                          </TableCell>
                          <TableCell>{getAreaName(feedback.area_id)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= feedback.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 font-semibold">{feedback.rating}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {feedback.comment ? (
                              <p className="text-sm text-gray-700 line-clamp-2">
                                {feedback.comment}
                              </p>
                            ) : (
                              <span className="text-gray-400 text-sm">No comment</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {feedback.submitted_by_name ? (
                              <div>
                                <div className="font-medium">{feedback.submitted_by_name}</div>
                                {feedback.submitted_by_email && (
                                  <div className="text-xs text-gray-500">
                                    {feedback.submitted_by_email}
                                  </div>
                                )}
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
    </AuthGuard>
  );
}
