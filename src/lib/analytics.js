/**
 * Provider-agnostic analytics. Swap the body of `trackEvent` to wire up
 * PostHog / Segment / Mixpanel / Plausible without touching every callsite.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("scan_check_in_completed", { area_id, client_id });
 */

const isProd = import.meta.env?.PROD === true;

export function trackEvent(name, properties = {}) {
  if (!name) return;

  if (!isProd) {
    console.info("[trackEvent]", name, properties);
  }
  // Production: no-op. Wire your provider here.
}

export const EVENTS = Object.freeze({
  SCAN_CHECK_IN_COMPLETED: "scan_check_in_completed",
  FEEDBACK_SUBMITTED: "feedback_submitted",
  PROJECT_CREATED: "project_created",
  TENANT_SIGNUP_COMPLETED: "tenant_signup_completed",
  QR_CODE_DOWNLOADED: "qr_code_downloaded",
  INVENTORY_COUNT_RECORDED: "inventory_count_recorded",
  INVENTORY_USAGE_RECORDED: "inventory_usage_recorded",
});
