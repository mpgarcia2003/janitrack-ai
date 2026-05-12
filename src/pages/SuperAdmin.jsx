
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp,
  Search,
  MoreVertical
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import AuthGuard from "../components/AuthGuard"; // Added AuthGuard import

export default function SuperAdmin() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['all-tenants'],
    queryFn: () => base44.entities.Tenant.list('-created_date'),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['all-plans'],
    queryFn: () => base44.entities.SubscriptionPlan.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTenantSubscription = (tenantId) => {
    return subscriptions.find(s => s.tenant_id === tenantId);
  };

  const getPlanName = (planId) => {
    return plans.find(p => p.id === planId)?.name || 'N/A';
  };

  const getTenantUserCount = (tenantId) => {
    return allUsers.filter(u => u.tenant_id === tenantId).length;
  };

  // Calculate totals
  const totalMRR = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => {
      const plan = plans.find(p => p.id === s.plan_id);
      return sum + (plan?.price_monthly || 0);
    }, 0);

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const trialSubscriptions = subscriptions.filter(s => s.status === 'trial').length;

  return (
    <AuthGuard> {/* Wrapped content with AuthGuard */}
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
            <p className="text-gray-600">Manage all tenants and subscriptions</p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Tenants</p>
                    <p className="text-3xl font-bold text-gray-900">{tenants.length}</p>
                  </div>
                  <Building2 className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{allUsers.length}</p>
                  </div>
                  <Users className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Monthly Recurring Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">${totalMRR.toFixed(0)}</p>
                  </div>
                  <DollarSign className="w-10 h-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active / Trial</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {activeSubscriptions} / {trialSubscriptions}
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenants List */}
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>All Tenants</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
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
                    {tenantsLoading ? (
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
                      filteredTenants.map(tenant => {
                        const subscription = getTenantSubscription(tenant.id);
                        const plan = plans.find(p => p.id === subscription?.plan_id);
                        const userCount = getTenantUserCount(tenant.id);
                        const mrr = plan?.price_monthly || 0;

                        return (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-medium">{tenant.name}</TableCell>
                            <TableCell className="font-mono text-sm text-gray-600">
                              {tenant.slug}
                            </TableCell>
                            <TableCell>
                              {subscription ? getPlanName(subscription.plan_id) : 'No Plan'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  subscription?.status === 'active' ? 'default' :
                                  subscription?.status === 'trial' ? 'secondary' :
                                  'destructive'
                                }
                                className={
                                  subscription?.status === 'active' ? 'bg-green-100 text-green-800' :
                                  subscription?.status === 'trial' ? 'bg-blue-100 text-blue-800' : ''
                                }
                              >
                                {subscription?.status || 'none'}
                              </Badge>
                            </TableCell>
                            <TableCell>{userCount}</TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {format(new Date(tenant.created_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${mrr}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
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
    </AuthGuard>
  );
}
