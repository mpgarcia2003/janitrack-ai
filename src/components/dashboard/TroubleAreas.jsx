import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInMinutes } from "date-fns";

export default function TroubleAreas({ areas, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Trouble Areas</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Trouble Areas
          </CardTitle>
          <Badge variant="destructive">{areas.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {areas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No trouble areas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {areas.map(area => {
              const minutesOverdue = area.last_cleaned_at && area.cadence_minutes
                ? differenceInMinutes(new Date(), new Date(area.last_cleaned_at)) - area.cadence_minutes
                : 0;
              
              return (
                <div 
                  key={area.id}
                  className="p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{area.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {area.complaint_count} complaints
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {area.risk_level}
                    </Badge>
                  </div>
                  {minutesOverdue > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-red-700">
                      <Clock className="w-3 h-3" />
                      <span>{minutesOverdue}min overdue</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}