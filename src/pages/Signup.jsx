import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, QrCode } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

export default function Signup() {
  const { signUpWithPassword, signInWithPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (isAuthenticated) navigate("/TenantSignup", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const { session } = await signUpWithPassword(email.trim(), password, fullName.trim());
      // If email confirmation is disabled in Supabase, we get a session back immediately.
      // Otherwise we have to ask the user to confirm via the link they got emailed.
      if (!session) {
        // No session means confirmation email is required. Try to sign in directly
        // — in many Supabase projects email confirmation is off for self-serve.
        try {
          await signInWithPassword(email.trim(), password);
        } catch {
          toast.success("Check your email to confirm your account");
          setSubmitting(false);
          return;
        }
      }
      toast.success("Account created");
      navigate("/TenantSignup", { replace: true });
    } catch (err) {
      reportError(err, { where: "Signup.handleSubmit" });
      setError(err?.message ?? "Failed to create account");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-center pb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <QrCode className="w-7 h-7 text-white" aria-hidden="true" />
              </div>
              <CardTitle className="text-3xl font-bold">JaniTrackAI</CardTitle>
            </div>
            <p className="text-emerald-100 mt-2 text-lg">Create your account</p>
            <p className="text-emerald-200 text-sm mt-1">14-day trial, no credit card</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="fullName" className="text-base">
                  Your Name
                </Label>
                <Input
                  id="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Cleaner"
                  className="mt-2 h-12 text-base"
                  autoComplete="name"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-base">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 h-12 text-base"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-base">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 h-12 text-base"
                  autoComplete="new-password"
                />
                <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
              </div>
              {error ? (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
              ) : null}
              <Button
                type="submit"
                disabled={submitting || !email || !password || !fullName}
                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
              <p className="text-sm text-gray-600 text-center">
                Already have an account?{" "}
                <Link to="/Login" className="text-emerald-700 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
