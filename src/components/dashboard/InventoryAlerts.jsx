import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryAlerts({ items, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Inventory Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
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
            <Package className="w-5 h-5 text-orange-600" />
            Inventory Alerts
          </CardTitle>
          <Badge variant="destructive">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">All stock levels healthy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 5).map(item => {
              const isCritical = item.reorder_point && item.on_hand <= item.reorder_point;
              
              return (
                <div 
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    isCritical 
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                      : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.on_hand} {item.unit} remaining
                      </p>
                    </div>
                    <Badge variant={isCritical ? "destructive" : "secondary"} className="text-xs">
                      {isCritical ? 'Critical' : 'Low'}
                    </Badge>
                  </div>
                  {item.reorder_point && (
                    <p className="text-xs text-gray-500 mt-2">
                      Reorder at: {item.reorder_point} {item.unit}
                    </p>
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