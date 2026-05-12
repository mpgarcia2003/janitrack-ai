import { createClient } from '@base44/sdk';

// Public client - for QR pages (NO AUTH REQUIRED)
export const base44Public = createClient({
  appId: "68fbc12dcfae5aa4e16bffe3",
  requiresAuth: false 
});