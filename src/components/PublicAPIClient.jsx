import { createClient } from "@base44/sdk";
import { appParams } from "@/lib/app-params";

/**
 * Anonymous (no-auth) SDK client for public QR flows.
 *
 * Resolution order for the app id:
 *   1. URL parameter / localStorage (`appParams.appId`)
 *   2. Vite env var `VITE_BASE44_APP_ID`
 *   3. Hardcoded fallback (the production JaniTrack app id)
 */
const FALLBACK_APP_ID = "68fbc12dcfae5aa4e16bffe3";

const appId =
  appParams.appId ||
  import.meta.env?.VITE_BASE44_APP_ID ||
  FALLBACK_APP_ID;

export const base44Public = createClient({
  appId,
  serverUrl: appParams.serverUrl || import.meta.env?.VITE_BASE44_BACKEND_URL,
  requiresAuth: false,
});
