import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { reportError } from "@/lib/error-reporting";

const AuthContext = createContext(null);

async function loadProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, tenant_id, user_role, role, active, last_login_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    reportError(error, { where: "AuthContext.loadProfile" });
    return null;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const hydrate = useCallback(async (nextSession) => {
    setSession(nextSession ?? null);
    if (nextSession?.user) {
      const profile = await loadProfile(nextSession.user.id);
      // Merge auth user + app profile so callers get email + full_name + tenant_id in one place.
      setUser({
        id: nextSession.user.id,
        email: nextSession.user.email,
        ...(profile ?? {}),
      });
    } else {
      setUser(null);
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error) reportError(error, { where: "AuthContext.getSession" });
      hydrate(data?.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydrate(nextSession);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, [hydrate]);

  const refetchUser = useCallback(async () => {
    if (!session?.user) return null;
    const profile = await loadProfile(session.user.id);
    setUser({ id: session.user.id, email: session.user.email, ...(profile ?? {}) });
    return profile;
  }, [session]);

  const signInWithPassword = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUpWithPassword = useCallback(async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      reportError(error, { where: "AuthContext.logout" });
    }
    setUser(null);
    setSession(null);
  }, []);

  const value = {
    session,
    user,
    isAuthenticated: !!session?.user,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError: null,
    refetchUser,
    signInWithPassword,
    signUpWithPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
