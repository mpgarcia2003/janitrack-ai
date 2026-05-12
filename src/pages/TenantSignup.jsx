import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Loader2 } from "lucide-react";

export default function TenantSignup() {
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user already has tenant_id
  useEffect(() => {
    base44.auth.me()
      .then(user => {
        if (user?.tenant_id) {
          // User already has tenant, redirect to dashboard
          console.log('User already has tenant_id, redirecting to Dashboard...');
          window.location.href = '/Dashboard';
        } else {
          setIsChecking(false);
        }
      })
      .catch(() => {
        // Not authenticated, redirect to login
        base44.auth.redirectToLogin('/TenantSignup');
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create the Tenant
      const tenant = await base44.entities.Tenant.create({
        name: companyName,
        slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        active: true
      });

      console.log('Tenant created:', tenant);

      // Step 2: Get current user and update their tenant_id and role
      const currentUser = await base44.auth.me();
      console.log('Current user before update:', currentUser);
      
      await base44.auth.updateMe({
        tenant_id: tenant.id,
        user_role: 'tenant_owner',
        phone: phone || ''
      });

      console.log('User updated with tenant_id and tenant_owner role');

      // Step 3: Find Free plan
      const plans = await base44.entities.SubscriptionPlan.filter({ slug: 'free' });
      const freePlan = plans[0];

      if (!freePlan) {
        throw new Error('Free plan not found. Please contact support.');
      }

      // Step 4: Create subscription with 14-day trial
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await base44.entities.Subscription.create({
        tenant_id: tenant.id,
        plan_id: freePlan.id,
        status: 'trial',
        billing_cycle: 'monthly',
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString()
      });

      console.log('Subscription created, redirecting to Dashboard...');

      // Success! Redirect to dashboard
      window.location.href = '/Dashboard';
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Show loading while checking tenant status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking account status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center pb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">JaniTrackAI</CardTitle>
            </div>
            <p className="text-blue-100 mt-2 text-lg">Complete Your Setup</p>
            <p className="text-blue-200 text-sm mt-1">Tell us about your company</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="companyName" className="text-base">Company Name *</Label>
                <Input
                  id="companyName"
                  name="companyName"
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
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="mt-2 h-12 text-base"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-700">
                  ✨ <strong>14-day free trial on the Free Plan</strong> - No credit card required
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  You won't be charged until your trial ends
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !companyName.trim()}
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Your Account...
                  </>
                ) : (
                  'Complete Setup & Start Trial'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}