/**
 * Thin wrapper around sonner so we have a single import surface for toasts.
 * The actual <Toaster /> is mounted in App.jsx via @/components/ui/toaster.
 */
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (msg, opts) => sonnerToast.success(msg, opts),
  error: (msg, opts) => sonnerToast.error(msg, opts),
  info: (msg, opts) => sonnerToast.message(msg, opts),
  warning: (msg, opts) => sonnerToast.warning(msg, opts),
  promise: (...args) => sonnerToast.promise(...args),
};
