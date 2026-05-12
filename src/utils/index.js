/**
 * Convert a page key (e.g. "Dashboard", "ScanCheckIn") into the matching app
 * route path. We preserve the original casing so the URLs printed on QR codes
 * keep matching their route registrations in App.jsx.
 */
export function createPageUrl(pageName) {
  if (!pageName) return "/";
  // Strip spaces if a caller passes "Areas & QR Codes" or similar.
  return `/${String(pageName).replace(/\s+/g, "")}`;
}
