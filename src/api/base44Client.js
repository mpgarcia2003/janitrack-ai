import { createClient } from "@base44/sdk";
import { appParams } from "@/lib/app-params";

const { appId, serverUrl, token, functionsVersion } = appParams;

/**
 * Authenticated SDK client used by every page guarded by RequireAuth.
 * Public QR pages should NOT import this — they use `base44Public` from
 * `@/components/PublicAPIClient` so an unauthenticated visitor isn't bounced
 * to the login flow.
 */
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: true,
});
