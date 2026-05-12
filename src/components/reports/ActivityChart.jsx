import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, eachDayOfInterval, startOfDay } from "date-fns";

export default function ActivityChart({ events }) {
  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = format(startOfDay(new Date(event.created_date)), 'yyyy-MM-dd');
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  // Get date range from events
  const dates = events.map(e => new Date(e.created_date));
  const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

  // Generate data for chart including zero days
  const chartData = eachDayOfInterval({ start: startOfDay(minDate), end: startOfDay(maxDate) })
    .map(date => ({
      date: format(date, 'MMM d'),
      count: eventsByDate[format(date, 'yyyy-MM-dd')] || 0
    }));

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Activity Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}