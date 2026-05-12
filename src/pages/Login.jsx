import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, QrCode } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

export default function Login() {
  const { signInWithPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      const next = location.state?.from ?? "/Dashboard";
      navigate(next, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
      toast.success("Welcome back");
      // onAuthStateChange will fire and the effect above will navigate.
    } catch (err) {
      reportError(err, { where: "Login.handleSubmit" });
      setError(err?.message ?? "Failed to sign in");
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
            <p className="text-emerald-100 mt-2 text-lg">Sign in</p>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 h-12 text-base"
                  autoComplete="current-password"
                />
              </div>
              {error ? (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
              ) : null}
              <Button
                type="submit"
                disabled={submitting || !email || !password}
                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <p className="text-sm text-gray-600 text-center">
                New here?{" "}
                <Link to="/Signup" className="text-emerald-700 font-semibold hover:underline">
                  Create an account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
