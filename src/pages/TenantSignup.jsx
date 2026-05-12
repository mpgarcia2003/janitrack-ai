import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
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

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

export default function TenantSignup() {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (user?.tenant_id) navigate("/Dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create the tenant.
      const baseSlug = slugify(companyName) || `tenant-${Date.now()}`;
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({ name: companyName.trim(), slug: `${baseSlug}-${Date.now().toString(36)}`, active: true })
        .select()
        .single();
      if (tenantError) throw tenantError;

      // 2. Attach this user to the tenant + mark them tenant_owner.
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ tenant_id: tenant.id, user_role: "tenant_owner", phone: phone || null })
        .eq("id", user.id);
      if (profileError) throw profileError;

      // 3. Create a trial subscription on the Free plan.
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("slug", "free")
        .maybeSingle();
      if (planError) throw planError;
      if (!plan) throw new Error("Free plan not found. Re-run the seed SQL in Supabase.");

      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      const { error: subError } = await supabase.from("subscriptions").insert({
        tenant_id: tenant.id,
        plan_id: plan.id,
        status: "trial",
        billing_cycle: "monthly",
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
      });
      if (subError) throw subError;

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
            <p className="text-emerald-100 mt-2 text-lg">Set up your company</p>
            <p className="text-emerald-200 text-sm mt-1">One more step</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="companyName" className="text-base">Company Name *</Label>
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
                <Label htmlFor="phone" className="text-base">Phone (Optional)</Label>
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
                  <strong>14-day free trial</strong> on the Free plan — no credit card needed.
                </p>
              </div>

              {error ? (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting || !companyName.trim()}
                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Creating your workspace…
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
