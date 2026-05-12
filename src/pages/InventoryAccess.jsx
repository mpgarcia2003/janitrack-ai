import { useEffect, useState } from "react";
import { apiInvoke } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Loader2, AlertCircle, AlertTriangle, TrendingDown, TrendingUp, Search } from "lucide-react";

function readToken() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  let token = params.get("token");
  if (!token && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
    token = hashParams.get("token");
  }
  return token;
}

const STATUS_BADGE = {
  critical: { className: "bg-red-100 text-red-800 border border-red-200", Icon: AlertTriangle, label: "Critical" },
  low: { className: "bg-yellow-100 text-yellow-800 border border-yellow-200", Icon: TrendingDown, label: "Low" },
  good: { className: "bg-emerald-100 text-emerald-800 border border-emerald-200", Icon: TrendingUp, label: "Good" },
};

export default function InventoryAccess() {
  const [token, setToken] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => setToken(readToken()), []);

  const inventoryQuery = useQuery({
    queryKey: ["inventory-access", token],
    queryFn: async () => {
      const response = await apiInvoke("get-area-inventory", { token });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data; // { client, items }
    },
    enabled: !!token,
    retry: false,
  });

  if (!token) {
    return (
      <Wrapper>
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Invalid QR Code</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">This link appears to be incomplete. Please scan a valid inventory QR code.</p>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  if (inventoryQuery.isLoading) {
    return (
      <Wrapper>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-600">Loading inventory…</p>
        </div>
      </Wrapper>
    );
  }

  if (inventoryQuery.isError || !inventoryQuery.data?.client) {
    return (
      <Wrapper>
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Client Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              {inventoryQuery.error?.message ?? "This QR code does not match any client."}
            </p>
          </CardContent>
        </Card>
      </Wrapper>
    );
  }

  const { client, items = [] } = inventoryQuery.data;
  const filtered = items.filter((item) => {
    if (!search) return true;
    const haystack = `${item.name ?? ""} ${item.sku ?? ""} ${item.category ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const counts = items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    { critical: 0, low: 0, good: 0 }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-2xl mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Package className="w-7 h-7" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-2xl">Inventory</CardTitle>
                <p className="text-purple-100 text-sm">{client.name}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <SummaryTile label="Critical" value={counts.critical} className="bg-red-50 text-red-700" />
              <SummaryTile label="Low" value={counts.low} className="bg-yellow-50 text-yellow-700" />
              <SummaryTile label="Healthy" value={counts.good} className="bg-emerald-50 text-emerald-700" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <Input
                placeholder="Search supplies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search inventory"
              />
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No supplies found</h3>
              <p className="text-gray-600">
                {search ? "Try a different search term." : "This location doesn't have any inventory items yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.good;
              const StatusIcon = badge.Icon;
              return (
                <Card key={item.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                        <p className="text-xs text-gray-500 font-mono mt-1">SKU: {item.sku}</p>
                        {item.category ? (
                          <p className="text-xs text-gray-500 capitalize mt-1">
                            {item.category.replace(/_/g, " ")} {item.unit ? `• ${item.unit}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <Badge className={badge.className}>
                        <StatusIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <Stat label="On Hand" value={item.on_hand} />
                      <Stat label="Par" value={item.par_level ?? "—"} />
                      <Stat label="Reorder" value={item.reorder_point ?? "—"} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Wrapper({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      {children}
    </div>
  );
}

function SummaryTile({ label, value, className }) {
  return (
    <div className={`rounded-lg p-3 text-center ${className}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-gray-50 p-2 text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
