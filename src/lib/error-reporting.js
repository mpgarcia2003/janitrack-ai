/**
 * Provider-agnostic error reporting. Swap the body of `reportError` to wire up
 * Sentry / LogRocket / Datadog etc. without touching every callsite.
 *
 * Usage:
 *   import { reportError } from "@/lib/error-reporting";
 *   reportError(err, { where: "Dashboard.useQuery.areas", user_id, tenant_id });
 */

const isProd = import.meta.env?.PROD === true;

export function reportError(error, context = {}) {
  if (!error) return;

  const payload = {
    message: error?.message ?? String(error),
    name: error?.name,
    stack: error?.stack,
    context,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
  };

  if (!isProd) {
    // eslint-disable-next-line no-console
    console.error("[reportError]", payload);
  } else {
    // eslint-disable-next-line no-console
    console.error("[reportError]", error?.message ?? error, context);
  }
}
