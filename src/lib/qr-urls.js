/**
 * Public QR codes live at fixed paths on the public app. By default they
 * point at the same origin the admin lives on (single Vercel deployment).
 * Override with VITE_PUBLIC_APP_URL if you want printed QRs to resolve to a
 * different subdomain (e.g. a dedicated scanner host like
 * https://scan.example.com).
 */
function publicBaseUrl() {
  const fromEnv = import.meta.env?.VITE_PUBLIC_APP_URL;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

const join = (path, params = {}) => {
  const base = publicBaseUrl();
  const query = new URLSearchParams(params).toString();
  return `${base}${path}${query ? `?${query}` : ""}`;
};

export const qrUrls = {
  scanCheckIn: (token) => join("/ScanCheckIn", { token }),
  areaFeedback: (token) => join("/FeedbackQR", { token }),
  facilityFeedback: (token) => join("/FeedbackQR", { facilityToken: token }),
  newProject: (token) => join("/NewProjectQR", { token }),
  inventory: (token) => join("/InventoryAccess", { token }),
};
