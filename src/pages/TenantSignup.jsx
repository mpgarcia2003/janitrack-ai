import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";
import { trackEvent, EVENTS } from "@/lib/analytics";

export default function TenantSignup() {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // If the user already has a tenant, route them to the dashboard.
  React.useEffect(() => {
    if (user?.tenant_id) {
      navigate("/Dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const tenant = await base44.entities.Tenant.create({
        name: companyName,
        slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        active: true,
      });

      await base44.auth.updateMe({
        tenant_id: tenant.id,
        user_role: "tenant_owner",
        phone: phone || "",
      });

      const plans = await base44.entities.SubscriptionPlan.filter({ slug: "free" });
      const freePlan = plans?.[0];
      if (!freePlan) {
        throw new Error("Free plan not found. Please contact support.");
      }

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      await base44.entities.Subscription.create({
        tenant_id: tenant.id,
        plan_id: freePlan.id,
        status: "trial",
        billing_cycle: "monthly",
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
      });

      trackEvent(EVENTS.TENANT_SIGNUP_COMPLETED, { tenant_id: tenant.id, plan: "free" });
      toast.success("Account created. Welcome to JaniTrackAI!");

      await refetchUser();
      navigate("/Dashboard", { replace: true });
    } catch (err) {
      reportError(err, { where: "TenantSignup.handleSubmit" });
      setError(err?.message ?? "Failed to create account. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-center pb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Rocket className="w-7 h-7 text-white" aria-hidden="true" />
              </div>
              <CardTitle className="text-3xl font-bold">JaniTrackAI</CardTitle>
            </div>
            <p className="text-emerald-100 mt-2 text-lg">Complete Your Setup</p>
            <p className="text-emerald-200 text-sm mt-1">Tell us about your company</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="companyName" className="text-base">
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company LLC"
                  className="mt-2 h-12 text-base"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-base">
                  Phone (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="mt-2 h-12 text-base"
                />
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-700">
                  <strong>14-day free trial on the Free Plan</strong> — No credit card required
                </p>
                <p className="text-xs text-gray-600 mt-1">You won't be charged until your trial ends.</p>
              </div>

              {error ? (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting || !companyName.trim()}
                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Creating your account…
                  </>
                ) : (
                  "Complete Setup & Start Trial"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
