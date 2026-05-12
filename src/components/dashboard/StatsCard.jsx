import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({ title, value, icon: Icon, bgColor, trend, trendUp = true }) {
  return (
    <Card className="relative overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
      <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-10 -translate-y-10 bg-gradient-to-br ${bgColor} rounded-full opacity-10`} />
      <CardHeader className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <CardTitle className="text-3xl md:text-4xl font-bold text-gray-900">
              {value}
            </CardTitle>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${bgColor} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-sm">
            {trendUp ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={trendUp ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {trend}
            </span>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}