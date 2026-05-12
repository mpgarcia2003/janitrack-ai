
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, User, Clock, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RecentEvents({ events, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="border-b">
          <CardTitle>Recent Cleaning Events</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format timestamp - trying DEVICE timestamp (when scan actually happened)
  const formatEventTime = (event) => {
    try {
      // Use device_timestamp if available, otherwise fall back to created_date
      const timestamp = event.device_timestamp || event.created_date;
      
      // Parse the ISO string
      const date = new Date(timestamp);
      
      // DEBUG
      console.log('Event time debug:', {
        device_timestamp: event.device_timestamp,
        created_date: event.created_date,
        using: timestamp,
        parsed: date.toString(),
        getHours: date.getHours(),
        getMinutes: date.getMinutes(),
        toLocaleString: date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      });
      
      // Use toLocaleTimeString which should handle timezone automatically
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Time error';
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Cleaning Events</CardTitle>
          <Badge variant="secondary">{events.length} events</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500"
            >
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No cleaning events in the last 24 hours</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 10).map((event, idx) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  {event.photo_url ? (
                    <img 
                      src={event.photo_url} 
                      alt="Cleaning"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{event.area_name || 'Area Check-In'}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{event.client_name || 'Client'}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatEventTime(event)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                      <User className="w-3.5 h-3.5" />
                      <span>{event.cleaner_name}</span>
                    </div>
                    {event.notes && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.notes}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {event.status && (
                        <Badge 
                          variant={event.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {event.status}
                        </Badge>
                      )}
                      {event.latitude && event.longitude && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="w-3 h-3 mr-1" />
                          GPS
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
