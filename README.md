# JaniTrackAI

> QR-based cleaning verification, inventory tracking, and customer feedback for janitorial operators.
> Part of the GreenPoint family of brands.

## Stack

- **Frontend**: Vite + React 18, react-router-dom 7, Tailwind, shadcn/ui
- **State**: @tanstack/react-query
- **Backend**: [Supabase](https://supabase.com) (Postgres + Auth + Storage)
- **API routes**: Vercel serverless functions (`/api/*`)
- **Billing**: Stripe (Checkout + Customer Portal + webhooks)
- **Hosting**: Vercel

## What's where

```
.
├── api/                         # Vercel serverless functions
│   ├── _supabase.js             # Service-role Supabase client (server only)
│   ├── _auth.js                 # Resolve caller's profile from Bearer token
│   ├── validate-qr-token.js     # Public: resolve any QR token to safe data
│   ├── validate-project-token.js
│   ├── record-check-in.js       # Public: cleaner check-in (tenant from token)
│   ├── record-feedback.js       # Public: area or facility feedback
│   ├── create-work-request.js   # Public: project submission
│   ├── get-area-inventory.js    # Public: inventory list for a client
│   ├── generate-branded-qr.js   # Auth: printable branded QR HTML
│   ├── create-checkout-session.js
│   ├── create-customer-portal.js
│   ├── cancel-subscription.js
│   └── stripe-webhook.js
├── supabase/
│   └── migrations/
│       └── 0001_init.sql        # Run this in Supabase SQL editor
├── src/
│   ├── App.jsx                  # Router + ErrorBoundary + AuthProvider
│   ├── Layout.jsx               # Authenticated sidebar shell
│   ├── lib/
│   │   ├── supabase.js          # Browser Supabase client
│   │   ├── AuthContext.jsx      # Single source of truth for the current user
│   │   ├── db.js                # Thin Supabase wrapper used by every page
│   │   ├── api-client.js        # apiInvoke() helper → /api/*
│   │   ├── storage.js           # uploadFile() helper → Supabase Storage
│   │   ├── qr-urls.js           # Build URLs for printed QR codes
│   │   ├── analytics.js, error-reporting.js, toast.js
│   │   ├── query-client.js, NavigationTracker.jsx, PageNotFound.jsx
│   │   └── utils.js
│   ├── components/
│   │   ├── RouteGuards.jsx      # RequireAuth + RequireTenant
│   │   ├── ErrorBoundary.jsx, EmptyState.jsx, QueryErrorState.jsx
│   │   ├── UserNotRegisteredError.jsx
│   │   └── (areas/, clients/, dashboard/, inventory/, projects/, reports/, ui/)
│   └── pages/
│       ├── Home.jsx             # Marketing landing
│       ├── Login.jsx, Signup.jsx
│       ├── TenantSignup.jsx     # Post-signup company setup
│       ├── Dashboard.jsx, Clients.jsx, Areas.jsx, Inventory.jsx,
│       ├── InventoryReports.jsx, Projects.jsx, Reports.jsx,
│       ├── Feedback.jsx, Settings.jsx, Billing.jsx, SuperAdmin.jsx
│       └── ScanCheckIn.jsx, FeedbackQR.jsx, NewProjectQR.jsx, InventoryAccess.jsx
├── vercel.json                  # SPA rewrite (excluding /api/*) + asset cache
├── .env.example
└── package.json
```

## First-time setup

### 1. Run the SQL migration in Supabase

1. Open your project at https://app.supabase.com.
2. Go to **SQL Editor** → **New query**.
3. Paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
4. Click **Run**. This creates every table, RLS policy, trigger, the `uploads` storage bucket, and seeds `Free` + `Pro` subscription plans.

### 2. Disable email confirmation (for instant signup)

If you want users to sign in immediately after `/Signup` without checking their inbox first:

- Supabase Dashboard → **Authentication** → **Providers** → **Email** → uncheck **Confirm email**.

Leave it on if you want the confirmation flow (the signup page already handles both cases gracefully).

### 3. Set environment variables

Copy `.env.example` → `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

You'll find both in Supabase Dashboard → **Settings → API**.

The **service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) is server-only. Add it to Vercel directly (Settings → Environment Variables) — never commit it.

Stripe vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are only needed if you turn on billing.

### 4. Local development

```bash
npm install
npm run dev
```

The Vite dev server boots at `http://localhost:5173`. Note that the `/api/*` routes only run on Vercel — for local testing of those, use `vercel dev` (requires the Vercel CLI).

## Deploying to Vercel

1. Push the repo to GitHub.
2. https://vercel.com/new → import the repo.
3. Vercel auto-detects **Vite**. Don't override the build/output settings.
4. Set environment variables (Production scope):

| Variable                       | Where to find it                                  | Public? |
| ------------------------------ | -------------------------------------------------- | ------- |
| `VITE_SUPABASE_URL`            | Supabase → Settings → API                          | yes     |
| `VITE_SUPABASE_ANON_KEY`       | Supabase → Settings → API → `anon` key             | yes     |
| `SUPABASE_SERVICE_ROLE_KEY`    | Supabase → Settings → API → `service_role` key     | **NO**  |
| `STRIPE_SECRET_KEY`            | Stripe → Developers → API keys                     | **NO**  |
| `STRIPE_WEBHOOK_SECRET`        | Stripe → Webhooks → endpoint signing secret        | **NO**  |
| `VITE_PUBLIC_APP_URL`          | Optional — defaults to `window.location.origin`    | yes     |

5. Deploy.

After it's live, point Stripe webhooks at `https://<your-vercel-domain>/api/stripe-webhook` and add the resulting signing secret to `STRIPE_WEBHOOK_SECRET`.

## Routes

| Path                | Public? | Notes                                                     |
| ------------------- | ------- | --------------------------------------------------------- |
| `/`                 | yes     | Marketing landing (redirects authed users to `/Dashboard`) |
| `/Login`, `/Signup` | yes     | Email/password auth via Supabase                          |
| `/ScanCheckIn`      | yes     | `?token=<area_qr_token>`                                  |
| `/FeedbackQR`       | yes     | `?token=…` or `?facilityToken=…`                          |
| `/NewProjectQR`     | yes     | `?token=<project_qr_token>`                               |
| `/InventoryAccess`  | yes     | `?token=<inventory_qr_token>`                             |
| `/TenantSignup`     | auth    | Onboarding (post-signup company setup)                    |
| `/Dashboard` etc.   | auth + tenant | The admin app                                       |

## Security model

- Every authenticated query goes through **Row Level Security** policies that enforce `tenant_id = current_tenant_id()` server-side.
- Public QR endpoints (`/api/record-check-in` et al.) ignore client-supplied tenant IDs entirely. The server resolves the tenant from the validated token.
- The service-role Supabase client is only imported by `/api/*` files — never by `src/*`.
- Stripe webhooks verify signatures and dedupe by `event.id` via the `processed_stripe_events` table.

## Conventions

- Toasts via `import { toast } from "@/lib/toast"` (sonner under the hood).
- Errors via `import { reportError } from "@/lib/error-reporting"` (no-op stub; swap for Sentry).
- Analytics via `import { trackEvent, EVENTS } from "@/lib/analytics"` (no-op stub).
- DB queries via `import { entities } from "@/lib/db"`. The wrapper mirrors the old `Entity.list/filter/create/update/delete` shape.
- API routes via `import { apiInvoke } from "@/lib/api-client"`.

## License

Private / proprietary. © GreenPoint Maintenance Services Corp.
