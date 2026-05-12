import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MapPin, Camera, ExternalLink } from "lucide-react";

export default function EventsTable({ events, getAreaName, getClientName, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Cleaning Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cleaning Events</CardTitle>
          <Badge variant="secondary">{events.length} records</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No events found for selected filters
                  </TableCell>
                </TableRow>
              ) : (
                events.slice(0, 50).map(event => (
                  <TableRow key={event.id} className="hover:bg-gray-50">
                    <TableCell className="whitespace-nowrap">
                      <div>
                        <div className="font-medium">
                          {format(new Date(event.created_date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(event.created_date), 'h:mm a')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getAreaName(event.area_id)}
                    </TableCell>
                    <TableCell>{getClientName(event.client_id)}</TableCell>
                    <TableCell>{event.cleaner_name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={event.status === 'completed' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {event.photo_url && (
                          <a 
                            href={event.photo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Camera className="w-4 h-4" />
                          </a>
                        )}
                        {event.latitude && (
                          <MapPin className="w-4 h-4 text-green-600" title="GPS location captured" />
                        )}
                        {event.notes && (
                          <span className="text-xs text-gray-500 truncate max-w-xs" title={event.notes}>
                            {event.notes}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}