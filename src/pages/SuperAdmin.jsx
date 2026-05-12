import React, { useState } from "react";
import { entities } from "@/lib/db";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Users, DollarSign, TrendingUp, Search, MoreVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

import QueryErrorState from "@/components/QueryErrorState";

export default function SuperAdmin() {
  const [searchTerm, setSearchTerm] = useState("");

  const tenantsQuery = useQuery({
    queryKey: ["all-tenants"],
    queryFn: () => entities.Tenant.list("-created_at"),
  });
  const subscriptionsQuery = useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: () => entities.Subscription.list("-created_at"),
  });
  const plansQuery = useQuery({
    queryKey: ["all-plans"],
    queryFn: () => entities.SubscriptionPlan.list(),
  });
  const usersQuery = useQuery({
    queryKey: ["all-users"],
    queryFn: () => entities.User.list(),
  });

  const anyError = tenantsQuery.error ?? subscriptionsQuery.error ?? plansQuery.error ?? usersQuery.error;
  if (anyError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-7xl mx-auto">
        <QueryErrorState
          error={anyError}
          onRetry={() => {
            tenantsQuery.refetch();
            subscriptionsQuery.refetch();
            plansQuery.refetch();
            usersQuery.refetch();
          }}
        />
      </div>
    );
  }

  const tenants = tenantsQuery.data ?? [];
  const subscriptions = subscriptionsQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const allUsers = usersQuery.data ?? [];

  const filteredTenants = tenants.filter(
    (t) =>
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSub = (tenantId) => subscriptions.find((s) => s.tenant_id === tenantId);
  const getPlanName = (planId) => plans.find((p) => p.id === planId)?.name ?? "N/A";
  const getUserCount = (tenantId) => allUsers.filter((u) => u.tenant_id === tenantId).length;

  const totalMRR = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (plans.find((p) => p.id === s.plan_id)?.price_monthly ?? 0), 0);
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const trialSubs = subscriptions.filter((s) => s.status === "trial").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
          <p className="text-gray-600">Manage all tenants and subscriptions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Stat label="Total Tenants" value={tenants.length} Icon={Building2} accent="text-emerald-500" />
          <Stat label="Total Users" value={allUsers.length} Icon={Users} accent="text-emerald-600" />
          <Stat label="Monthly Recurring Revenue" value={`$${totalMRR.toFixed(0)}`} Icon={DollarSign} accent="text-purple-500" />
          <Stat label="Active / Trial" value={`${activeSubs} / ${trialSubs}`} Icon={TrendingUp} accent="text-orange-500" />
        </div>

        <Card className="shadow-md">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>All Tenants</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <Input
                  placeholder="Search tenants…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Search tenants"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : filteredTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No tenants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenants.map((tenant) => {
                      const sub = getSub(tenant.id);
                      const plan = plans.find((p) => p.id === sub?.plan_id);
                      const userCount = getUserCount(tenant.id);
                      const mrr = plan?.price_monthly ?? 0;
                      return (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell className="font-mono text-sm text-gray-600">{tenant.slug}</TableCell>
                          <TableCell>{sub ? getPlanName(sub.plan_id) : "No Plan"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sub?.status === "active"
                                  ? "default"
                                  : sub?.status === "trial"
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={
                                sub?.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : sub?.status === "trial"
                                  ? "bg-blue-100 text-blue-800"
                                  : ""
                              }
                            >
                              {sub?.status ?? "none"}
                            </Badge>
                          </TableCell>
                          <TableCell>{userCount}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {format(new Date(tenant.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-semibold">${mrr}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" aria-label={`Open ${tenant.name} actions`}>
                              <MoreVertical className="w-4 h-4" aria-hidden="true" />
                            </Button>
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
      </div>
    </div>
  );
}

function Stat({ label, value, Icon, accent }) {
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
