
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Package
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import AuthGuard from "../components/AuthGuard";

export default function Billing() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['my-subscription', user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return null;
      const subs = await base44.entities.Subscription.filter({ tenant_id: user.tenant_id });
      return subs[0] || null;
    },
    enabled: !!user?.tenant_id,
  });

  const { data: plan } = useQuery({
    queryKey: ['subscription-plan', subscription?.plan_id],
    queryFn: async () => {
      if (!subscription?.plan_id) return null;
      const plans = await base44.entities.SubscriptionPlan.filter({ id: subscription.plan_id });
      return plans[0] || null;
    },
    enabled: !!subscription?.plan_id,
  });

  // Get current usage
  const { data: clients = [] } = useQuery({
    queryKey: ['my-clients', user?.tenant_id],
    queryFn: () => base44.entities.Client.filter({ tenant_id: user.tenant_id }),
    enabled: !!user?.tenant_id,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['my-areas', user?.tenant_id],
    queryFn: () => base44.entities.Area.filter({ tenant_id: user.tenant_id }),
    enabled: !!user?.tenant_id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['my-users', user?.tenant_id],
    queryFn: () => base44.entities.User.filter({ tenant_id: user.tenant_id }),
    enabled: !!user?.tenant_id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['my-projects', user?.tenant_id],
    queryFn: () => base44.entities.Project.filter({ tenant_id: user.tenant_id }),
    enabled: !!user?.tenant_id,
  });

  if (subLoading || !subscription || !plan) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-64 w-full mb-6" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const daysUntilRenewal = subscription.current_period_end
    ? differenceInDays(new Date(subscription.current_period_end), new Date())
    : 0;

  const isTrialing = subscription.status === 'trial';
  const daysLeftInTrial = subscription.trial_ends_at
    ? differenceInDays(new Date(subscription.trial_ends_at), new Date())
    : 0;

  const usageData = [
    {
      label: 'Locations',
      current: clients.length,
      limit: plan.limits?.max_clients,
      icon: Package
    },
    {
      label: 'Areas',
      current: areas.length,
      limit: plan.limits?.max_areas,
      icon: Package
    },
    {
      label: 'Users',
      current: users.length,
      limit: plan.limits?.max_users,
      icon: Package
    },
    {
      label: 'Projects',
      current: projects.length,
      limit: plan.limits?.max_projects,
      icon: Package
    },
  ];

  const handleManageBilling = async () => {
    try {
      const { data } = await base44.functions.invoke('createCustomerPortal');
      window.location.href = data.url;
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Failed to open billing portal');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

          {/* Trial Banner */}
          {isTrialing && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      🎉 Your Free Trial is Active
                    </h3>
                    <p className="text-gray-700">
                      <strong>{daysLeftInTrial} days</strong> remaining in your 14-day trial
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Add a payment method before {format(new Date(subscription.trial_ends_at), 'MMM d, yyyy')} to continue
                    </p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleManageBilling}>
                    Add Payment Method
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Plan */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="md:col-span-2 shadow-md">
              <CardHeader className="border-b">
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{plan.name}</h2>
                    <p className="text-2xl font-semibold text-blue-600 mt-2">
                      ${subscription.billing_cycle === 'monthly' ? plan.price_monthly : plan.price_yearly}
                      <span className="text-base text-gray-600">/{subscription.billing_cycle === 'monthly' ? 'month' : 'year'}</span>
                    </p>
                  </div>
                  <Badge 
                    variant={subscription.status === 'active' ? 'default' : 'secondary'}
                    className={subscription.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {subscription.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Billing Cycle</span>
                    <span className="font-semibold capitalize">{subscription.billing_cycle}</span>
                  </div>
                  {!isTrialing && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Next Billing Date</span>
                        <span className="font-semibold">
                          {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Days Until Renewal</span>
                        <span className="font-semibold">{daysUntilRenewal} days</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">Included Features:</h4>
                  <ul className="space-y-2">
                    {plan.features?.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <Button className="w-full" onClick={handleManageBilling}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>
                <Button className="w-full" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
                <Button className="w-full" variant="outline" onClick={handleManageBilling}>
                  <Calendar className="w-4 h-4 mr-2" />
                  View Invoices
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Usage Stats */}
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle>Usage & Limits</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {usageData.map((item) => {
                  const percentage = item.limit ? (item.current / item.limit) * 100 : 0;
                  const isNearLimit = percentage > 80;
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-gray-400" />
                          <span className="font-semibold text-gray-900">{item.label}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {item.current} / {item.limit || '∞'}
                        </span>
                      </div>
                      {item.limit && (
                        <>
                          <Progress 
                            value={percentage} 
                            className={`h-2 ${isNearLimit ? 'bg-red-100' : ''}`}
                          />
                          {isNearLimit && (
                            <div className="flex items-center gap-2 text-xs text-orange-600">
                              <AlertCircle className="w-3 h-3" />
                              <span>Approaching limit</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
