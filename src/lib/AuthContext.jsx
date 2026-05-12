import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { createAxiosClient } from "@base44/sdk/dist/utils/axios-client";
import { reportError } from "@/lib/error-reporting";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const refetchUser = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (error) {
      setIsAuthenticated(false);
      if (error?.status === 401 || error?.status === 403) {
        setAuthError({ type: "auth_required", message: "Authentication required" });
      } else {
        reportError(error, { where: "AuthContext.refetchUser" });
      }
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: { "X-App-Id": appParams.appId },
        token: appParams.token,
        interceptResponses: true,
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await refetchUser();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
      } catch (appError) {
        reportError(appError, { where: "AuthContext.checkAppState" });
        if (appError?.status === 403 && appError?.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === "auth_required") {
            setAuthError({ type: "auth_required", message: "Authentication required" });
          } else if (reason === "user_not_registered") {
            setAuthError({ type: "user_not_registered", message: "User not registered for this app" });
          } else {
            setAuthError({ type: reason, message: appError?.message });
          }
        } else {
          setAuthError({ type: "unknown", message: appError?.message ?? "Failed to load app" });
        }
        setIsLoadingAuth(false);
      } finally {
        setIsLoadingPublicSettings(false);
      }
    } catch (error) {
      reportError(error, { where: "AuthContext.checkAppState.outer" });
      setAuthError({ type: "unknown", message: error?.message ?? "An unexpected error occurred" });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  }, [refetchUser]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = useCallback((shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      if (shouldRedirect) {
        base44.auth.logout(window.location.href);
      } else {
        base44.auth.logout();
      }
    } catch (error) {
      reportError(error, { where: "AuthContext.logout" });
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    try {
      base44.auth.redirectToLogin(window.location.href);
    } catch (error) {
      reportError(error, { where: "AuthContext.navigateToLogin" });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        refetchUser,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
