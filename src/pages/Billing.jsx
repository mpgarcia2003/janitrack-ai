import React from "react";
import { entities } from "@/lib/db";
import { apiInvoke } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Calendar, TrendingUp, AlertCircle, CheckCircle, Package } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

export default function Billing() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;

  const subscriptionQuery = useQuery({
    queryKey: ["my-subscription", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const subs = await entities.Subscription.filter({ tenant_id: tenantId });
      return subs?.[0] ?? null;
    },
    enabled: !!tenantId,
  });

  const planQuery = useQuery({
    queryKey: ["subscription-plan", subscriptionQuery.data?.plan_id],
    queryFn: async () => {
      const planId = subscriptionQuery.data?.plan_id;
      if (!planId) return null;
      const plans = await entities.SubscriptionPlan.filter({ id: planId });
      return plans?.[0] ?? null;
    },
    enabled: !!subscriptionQuery.data?.plan_id,
  });

  const clientsQuery = useQuery({
    queryKey: ["my-clients", tenantId],
    queryFn: () => entities.Client.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });
  const areasQuery = useQuery({
    queryKey: ["my-areas", tenantId],
    queryFn: () => entities.Area.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });
  const usersQuery = useQuery({
    queryKey: ["my-users", tenantId],
    queryFn: () => entities.User.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });
  const projectsQuery = useQuery({
    queryKey: ["my-projects", tenantId],
    queryFn: () => entities.Project.filter({ tenant_id: tenantId }),
    enabled: !!tenantId,
  });

  const anyError = subscriptionQuery.error ?? planQuery.error;
  if (anyError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-6xl mx-auto">
        <QueryErrorState
          error={anyError}
          onRetry={() => {
            subscriptionQuery.refetch();
            planQuery.refetch();
          }}
        />
      </div>
    );
  }

  const subscription = subscriptionQuery.data;
  const plan = planQuery.data;

  const handleManageBilling = async () => {
    try {
      const { data } = await apiInvoke("create-customer-portal");
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error ?? "No portal URL returned");
    } catch (error) {
      reportError(error, { where: "Billing.handleManageBilling" });
      toast.error("Failed to open billing portal");
    }
  };

  if (subscriptionQuery.isLoading || (subscription && planQuery.isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-64 w-full mb-6" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!subscription || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold mb-2">No subscription found</h3>
            <p className="text-gray-600 mb-4">
              We couldn't load a subscription for your account. Contact support if this looks wrong.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysUntilRenewal = subscription.current_period_end
    ? differenceInDays(new Date(subscription.current_period_end), new Date())
    : 0;
  const isTrialing = subscription.status === "trial";
  const daysLeftInTrial = subscription.trial_ends_at
    ? differenceInDays(new Date(subscription.trial_ends_at), new Date())
    : 0;

  const usageData = [
    { label: "Locations", current: (clientsQuery.data ?? []).length, limit: plan.limits?.max_clients, icon: Package },
    { label: "Areas", current: (areasQuery.data ?? []).length, limit: plan.limits?.max_areas, icon: Package },
    { label: "Users", current: (usersQuery.data ?? []).length, limit: plan.limits?.max_users, icon: Package },
    { label: "Projects", current: (projectsQuery.data ?? []).length, limit: plan.limits?.max_projects, icon: Package },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

        {isTrialing ? (
          <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-purple-50 border-2 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Free Trial is Active</h3>
                  <p className="text-gray-700">
                    <strong>{daysLeftInTrial} days</strong> remaining in your 14-day trial
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Add a payment method before {format(new Date(subscription.trial_ends_at), "MMM d, yyyy")} to continue.
                  </p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleManageBilling}>
                  Add Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2 shadow-md">
            <CardHeader className="border-b">
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{plan.name}</h2>
                  <p className="text-2xl font-semibold text-emerald-700 mt-2">
                    ${subscription.billing_cycle === "monthly" ? plan.price_monthly : plan.price_yearly}
                    <span className="text-base text-gray-600">
                      /{subscription.billing_cycle === "monthly" ? "month" : "year"}
                    </span>
                  </p>
                </div>
                <Badge
                  variant={subscription.status === "active" ? "default" : "secondary"}
                  className={subscription.status === "active" ? "bg-emerald-100 text-emerald-800" : ""}
                >
                  {subscription.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Billing Cycle</span>
                  <span className="font-semibold capitalize">{subscription.billing_cycle}</span>
                </div>
                {!isTrialing ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Next Billing Date</span>
                      <span className="font-semibold">
                        {subscription.current_period_end
                          ? format(new Date(subscription.current_period_end), "MMM d, yyyy")
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Days Until Renewal</span>
                      <span className="font-semibold">{daysUntilRenewal} days</span>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-gray-900 mb-3">Included Features:</h4>
                <ul className="space-y-2">
                  {(plan.features ?? []).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-600" aria-hidden="true" />
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
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleManageBilling}>
                <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
                Manage Billing
              </Button>
              <Button className="w-full" variant="outline" onClick={handleManageBilling}>
                <TrendingUp className="w-4 h-4 mr-2" aria-hidden="true" />
                Upgrade or Change Plan
              </Button>
              <Button className="w-full" variant="outline" onClick={handleManageBilling}>
                <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
                View Invoices
              </Button>
            </CardContent>
          </Card>
        </div>

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
                        <Icon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        <span className="font-semibold text-gray-900">{item.label}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {item.current} / {item.limit ?? "∞"}
                      </span>
                    </div>
                    {item.limit ? (
                      <>
                        <Progress value={percentage} className={`h-2 ${isNearLimit ? "bg-red-100" : ""}`} />
                        {isNearLimit ? (
                          <div className="flex items-center gap-2 text-xs text-orange-600">
                            <AlertCircle className="w-3 h-3" aria-hidden="true" />
                            <span>Approaching limit</span>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
